// Nền chuyển sắc.
//
// React Native không vẽ được gradient bằng style, và dự án không cài
// react-native-linear-gradient. react-native-svg thì đã có sẵn (pod RNSVG trong
// ios/Podfile.lock), nên dựng bằng cách phủ một <Svg> kín phía sau nội dung.
//
// Bo góc để View bọc ngoài lo bằng borderRadius + overflow:'hidden' — không dùng
// thuộc tính rx của <Rect>, vì rx bo cả bốn góc như nhau, không làm được kiểu chỉ
// bo hai góc dưới.
import { useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

let seq = 0;

export default function Gradient({
  colors,
  angle = 'diagonal',
  style,
  children,
}: {
  colors: readonly string[];
  /** 'vertical' = trên xuống dưới; 'diagonal' = trái-trên sang phải-dưới. */
  angle?: 'vertical' | 'diagonal';
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}) {
  // Mỗi instance cần một id riêng: <Defs> dùng chung không gian tên trong cả cây,
  // trùng id thì khối vẽ sau đè bảng màu của khối vẽ trước.
  const id = useRef(`grad-${seq++}`).current;
  const x2 = angle === 'vertical' ? '0' : '1';

  return (
    <View style={[styles.wrap, style]}>
      {/* <Svg> nằm trong một lớp View phủ tuyệt đối, không đặt position:absolute
          thẳng lên chính nó: RNSVG tự áp style riêng cho Svg, để trần thì nó vẫn dự
          phần vào phép đo của View cha và làm khối co lại. Chỗ nào chiều rộng cố định
          thì không thấy, nhưng chip tự co theo chữ sẽ bị bóp lại và cắt mất chữ. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2={x2} y2="1">
              {colors.map((color, i) => (
                <Stop
                  key={color + i}
                  offset={`${(i / Math.max(colors.length - 1, 1)) * 100}%`}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
