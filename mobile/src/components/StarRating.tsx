// Dải 5 sao. Không truyền onChange thì chỉ để đọc (danh sách đánh giá); có onChange
// thì bấm được để chấm điểm (màn viết đánh giá).
//
// Khác component Rating: Rating hiển thị điểm trung bình dạng "★ 4.9 (128)" trong danh
// sách sản phẩm, còn đây là từng ngôi sao rời.
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { colors, spacing } from '../theme';

const STAR_COLOR = colors.warning;
const STAR_EMPTY = '#d9d9d9';

export default function StarRating({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (next: number) => void;
  size?: number;
}) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        const icon = <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={filled ? STAR_COLOR : STAR_EMPTY} />;

        // BE yêu cầu rating >= 1 nên bấm lại đúng ngôi sao đang chọn không đưa về 0.
        return onChange ? (
          <Pressable
            key={star}
            accessibilityRole="radio"
            accessibilityLabel={`${star} sao`}
            accessibilityState={{ selected: star === Math.round(value) }}
            onPress={() => onChange(star)}
            hitSlop={4}
          >
            {icon}
          </Pressable>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
});
