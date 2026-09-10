// Chọn địa chỉ bằng cách kéo bản đồ (giống "Chọn trên bản đồ" của Shopee/Grab).
//
// Ghim đứng yên GIỮA màn, bản đồ chạy bên dưới — cách này không cần xử lý kéo-thả
// marker, và ngón tay người dùng không che mất điểm đang chọn.
//
// Bản đồ vẽ bằng MapLibre GL JS chạy trong WebView, KHÔNG dùng thư viện bản đồ native:
// cả app chỉ có đúng một màn cần bản đồ, không đáng để kéo theo cả một SDK native vài
// chục MB. Nền bản đồ lấy từ OpenFreeMap — miễn phí, không cần khoá, không giới hạn
// lượt xem; tile công cộng của openstreetmap.org KHÔNG dùng được vì chính sách của họ
// cấm phát hành app dùng tile đó.
//
// Toạ độ đổi ngược thành chuỗi địa chỉ bằng GET /api/places/reverse (Photon).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import Geolocation from '@react-native-community/geolocation';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import { placeApi, type PlaceSuggestion } from '../../api/places';
import { getErrorMessage } from '../../api/client';
import { colors, radius, shadow, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'LocationPicker'>;

// Điểm mở đầu khi chưa xin được vị trí thật và cũng không vào từ một gợi ý: Hồ Gươm.
const DEFAULT_CENTER = { lat: 21.0287, lon: 105.8524 };

// Tự xin quyền thay vì để thư viện tự làm — nếu không trên Android sẽ hiện hai hộp
// thoại chồng nhau, và mình mất chỗ để giải thích bằng tiếng Việt vì sao cần quyền.
Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Cho phép NexTech dùng vị trí',
        message:
          'Dùng để đặt sẵn ghim trên bản đồ vào chỗ bạn đang đứng, cho đỡ phải kéo tìm.',
        buttonPositive: 'Cho phép',
        buttonNegative: 'Để sau',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS tự hiện hộp thoại, lời giải thích lấy từ NSLocationWhenInUseUsageDescription
  // trong Info.plist.
  return new Promise((resolve) => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false),
    );
  });
}

// Bọc lại API kiểu callback cho hợp với phần còn lại của màn.
function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
}

// Kéo bản đồ liên tục thì mỗi lần dừng tay không đáng một lượt gọi API — Photon giới
// hạn mềm khoảng 1 request/giây.
const REVERSE_DEBOUNCE_MS = 500;

// react-native-webview@14.0.1 khai kiểu WebView là FunctionComponent nên TypeScript
// không cho gắn ref — nhưng bản dựng thật là forwardRef, có useImperativeHandle phơi ra
// injectJavaScript (xem lib/WebView.ios.js). Khai lại đúng phần mình dùng thay vì bỏ
// ref: không có nó thì phía React Native không điều khiển được bản đồ.
interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}
const RefWebView = WebView as unknown as React.ForwardRefExoticComponent<
  WebViewProps & React.RefAttributes<WebViewHandle>
>;

const MAPLIBRE_VERSION = '5.24.0';
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

function buildMapHtml(lat: number, lon: number): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
  .maplibregl-ctrl-attrib { font-size: 10px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  function send(type, payload) {
    var data = { type: type };
    for (var k in payload) data[k] = payload[k];
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(data));
  }
  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) {
      return false;
    }
  }
  // Lỗi ngoài luồng (MapLibre ném khi không dựng được ngữ cảnh WebGL) — không bắt thì
  // màn hình trắng trơn cho tới lúc hết giờ chờ.
  window.onerror = function (message) {
    if (!window.__ready) send('error', { message: String(message).slice(0, 150) });
  };
  function start() {
    if (!window.maplibregl) {
      send('error', { message: 'Không tải được thư viện bản đồ' });
      return;
    }
    // Máy ảo Android và một số máy đời cũ không có WebGL — báo ngay chứ đừng bắt
    // người dùng ngồi nhìn màn trắng rồi mới biết.
    if (!hasWebGL()) {
      send('error', { message: 'Thiết bị không hỗ trợ WebGL nên không vẽ được bản đồ' });
      return;
    }
    var map;
    try {
      map = new maplibregl.Map({
        container: 'map',
        style: '${MAP_STYLE_URL}',
        center: [${lon}, ${lat}],
        zoom: 16
      });
    } catch (e) {
      send('error', { message: (e && e.message) || 'Không khởi tạo được bản đồ' });
      return;
    }
    // Phơi ra ngoài để phía React Native dời được bản đồ khi lấy xong vị trí máy.
    window.__map = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
    map.on('load', function () {
      // Nền bản đồ mặc định ghi nhãn tiếng Anh ("Hanoi", "Le Lai Street") — lệch hẳn
      // với phần còn lại của app. Ưu tiên tên tiếng Việt, không có mới lùi về tên gốc.
      try {
        map.getStyle().layers.forEach(function (layer) {
          if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
            map.setLayoutProperty(layer.id, 'text-field', [
              'coalesce',
              ['get', 'name:vi'],
              ['get', 'name'],
              ['get', 'name:latin']
            ]);
          }
        });
      } catch (e) {
        // Đổi nhãn hỏng thì bản đồ vẫn dùng được — không đáng để chặn cả màn hình.
      }
      window.__ready = true;
      send('ready', {});
    });
    map.on('moveend', function () {
      var c = map.getCenter();
      send('move', { lat: c.lat, lon: c.lng });
    });
    // Sau khi bản đồ đã hiện, lỗi tải lẻ tẻ từng ô tile là chuyện thường — chỉ báo
    // những lỗi xảy ra TRƯỚC khi vẽ được, tức là lỗi làm màn hình trống.
    map.on('error', function (e) {
      if (!window.__ready) {
        send('error', { message: (e && e.error && e.error.message) || 'Bản đồ gặp lỗi' });
      }
    });
  }
  window.addEventListener('load', start);
  setTimeout(function () {
    if (!window.__ready) send('error', { message: 'Bản đồ tải quá lâu, kiểm tra kết nối mạng' });
  }, 15000);
</script>
</body>
</html>`;
}

export default function LocationPickerScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  // Chốt điểm mở đầu đúng một lần. HTML đổi là WebView nạp lại từ đầu và bản đồ giật
  // về chỗ cũ ngay giữa lúc người dùng đang kéo — nên nó không được phụ thuộc state.
  const initial = useRef({
    lat: params?.lat ?? DEFAULT_CENTER.lat,
    lon: params?.lon ?? DEFAULT_CENTER.lon,
  }).current;
  const html = useMemo(() => buildMapHtml(initial.lat, initial.lon), [initial]);

  const webRef = useRef<WebViewHandle>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [center, setCenter] = useState(initial);
  const [place, setPlace] = useState<PlaceSuggestion | null>(null);
  const [looking, setLooking] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Mỗi lần bản đồ dừng lại thì hỏi địa chỉ của điểm giữa màn.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLooking(true);
      try {
        const res = await placeApi.reverse(center.lat, center.lon, controller.signal);
        setPlace(res.item);
        setNote(res.item ? null : 'Chưa xác định được địa chỉ ở điểm này, thử kéo tới gần đường hơn');
      } catch (err) {
        if (controller.signal.aborted) return;
        setPlace(null);
        setNote(getErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLooking(false);
      }
    }, REVERSE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [center]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    let msg: { type?: string; lat?: number; lon?: number; message?: string };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'move' && typeof msg.lat === 'number' && typeof msg.lon === 'number') {
      setCenter({ lat: msg.lat, lon: msg.lon });
    } else if (msg.type === 'ready') {
      setMapReady(true);
    } else if (msg.type === 'error') {
      setMapError(msg.message ?? 'Không mở được bản đồ');
    }
  }, []);

  // Nhảy thẳng tới toạ độ mới, KHÔNG dùng flyTo: flyTo chạy hoạt ảnh bay theo quãng
  // đường, đo thật thì Hà Nội -> TP.HCM mất 10 giây mới xong, mà `moveend` chỉ bắn khi
  // hoạt ảnh kết thúc — bấm nút định vị xong phải ngồi chờ chừng ấy giây địa chỉ mới
  // đổi. jumpTo bắn `moveend` ngay.
  //
  // Cũng vì `moveend` tự báo ngược về đây nên KHÔNG gọi setCenter ở đây, tránh chạy
  // hai lượt hỏi địa chỉ cho cùng một điểm.
  const moveMapTo = useCallback((lat: number, lon: number) => {
    webRef.current?.injectJavaScript(
      `window.__map && window.__map.jumpTo({ center: [${lon}, ${lat}], zoom: 17 }); true;`,
    );
  }, []);

  // `silent` = lượt tự chạy lúc mới mở màn: từ chối quyền thì im lặng dùng điểm mặc
  // định, không chặn người dùng bằng hộp thoại họ vừa mới bấm từ chối.
  const locate = useCallback(
    async (silent: boolean) => {
      if (locating) return;
      setLocating(true);
      try {
        const allowed = await ensureLocationPermission();
        if (!allowed) {
          if (!silent) {
            Alert.alert(
              'Chưa có quyền vị trí',
              'Bạn có thể bật lại trong phần Cài đặt của máy, hoặc cứ kéo bản đồ tới đúng chỗ cần giao.',
              [
                { text: 'Để sau', style: 'cancel' },
                { text: 'Mở cài đặt', onPress: () => void Linking.openSettings() },
              ],
            );
          }
          return;
        }
        const pos = await getCurrentPosition();
        moveMapTo(pos.lat, pos.lon);
      } catch (err) {
        if (!silent) {
          Alert.alert('Không lấy được vị trí', (err as Error)?.message ?? 'Thử lại sau ít phút.');
        }
      } finally {
        setLocating(false);
      }
    },
    [moveMapTo, locating],
  );

  // Chỉ tự đi tìm vị trí khi KHÔNG vào từ một gợi ý đã chọn — vào từ gợi ý thì người
  // dùng đã chỉ rõ chỗ họ muốn, kéo bản đồ đi chỗ khác là làm hỏng ý họ.
  const autoLocate = params?.lat == null || params?.lon == null;
  useEffect(() => {
    if (!mapReady || !autoLocate) return;
    void locate(true);
    // `locate` đổi theo cờ `locating` nên không đưa vào đây, kẻo chạy lại giữa chừng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, autoLocate]);

  // Trả kết quả về màn Thêm/Sửa địa chỉ qua tham số tuyến — cùng lối với màn chọn mã
  // giảm giá trả về màn Đặt hàng. `addressId` đi nhờ để màn kia biết vẫn đang sửa
  // đúng địa chỉ cũ chứ không nhảy sang chế độ thêm mới.
  const confirm = () => {
    if (!place) return;
    navigation.navigate('AddressForm', {
      addressId: params?.addressId,
      pickedAddress: place.description,
    });
  };

  if (mapError) {
    return (
      <Screen edges={[]}>
        <View style={styles.errorWrap}>
          <Ionicons name="map-outline" size={44} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Không mở được bản đồ</Text>
          <Text style={styles.errorDesc}>{mapError}</Text>
          <AppButton title="Quay lại nhập tay" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <View style={styles.mapWrap}>
        <RefWebView
          ref={webRef}
          source={{ html }}
          onMessage={onMessage}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          // MapLibre vẽ bằng WebGL; trên Android phải ép WebView chạy lớp phần cứng,
          // để mặc định có máy rơi về vẽ phần mềm và canvas ra trắng.
          androidLayerType="hardware"
          // Bản đồ tự có cử chỉ kéo/thu phóng riêng, để WebView cuộn nữa thì hai thứ
          // tranh nhau ngón tay.
          scrollEnabled={false}
          style={styles.map}
        />

        {/* Ghim đứng yên giữa khung bản đồ. Lùi lên nửa chiều cao để MŨI ghim (đáy
            biểu tượng) trùng đúng tâm, không phải thân ghim. */}
        <View pointerEvents="none" style={styles.pinWrap}>
          <Ionicons name="location" size={40} color={colors.primary} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về vị trí của tôi"
          onPress={() => void locate(false)}
          style={({ pressed }) => [styles.locateBtn, pressed && styles.locateBtnPressed]}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={20} color={colors.primary} />
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Địa chỉ tại điểm đang chọn</Text>

        {looking ? (
          <View style={styles.row}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.searching}>Đang xác định địa chỉ…</Text>
          </View>
        ) : place ? (
          <>
            <Text style={styles.main} numberOfLines={1}>
              {place.main_text ?? place.description}
            </Text>
            {place.secondary_text ? (
              <Text style={styles.secondary} numberOfLines={2}>
                {place.secondary_text}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.note}>{note}</Text>
        )}

        {/* Dữ liệu OpenStreetMap ở Việt Nam gần như không có số nhà — nói trước để
            người dùng biết vẫn phải bổ sung, thay vì tưởng đã xong rồi giao nhầm. */}
        <Text style={styles.hint}>
          Chọn xong bạn vẫn nên thêm số nhà, ngõ/ngách vào ô địa chỉ.
        </Text>

        <AppButton
          title="Dùng địa chỉ này"
          block
          disabled={!place || looking}
          onPress={confirm}
          style={styles.confirm}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: { flex: 1, backgroundColor: colors.surfaceAlt },
  map: { flex: 1 },
  pinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
  },

  // Góc dưới BÊN PHẢI: nút thu phóng của bản đồ đã chiếm góc dưới bên trái.
  locateBtn: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadow.float,
  },
  locateBtnPressed: { backgroundColor: colors.primarySoft },

  card: {
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.raised,
  },
  cardLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  searching: { fontSize: 14, color: colors.textSecondary },
  main: { fontSize: 15.5, fontWeight: '700', color: colors.text },
  secondary: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  note: { fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },
  hint: { fontSize: 11.5, color: colors.textMuted, marginTop: spacing.xs },
  confirm: { marginTop: spacing.md },

  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  errorTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  errorDesc: { fontSize: 13.5, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
});
