import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';

export const PAYOS_CLIENT = 'PAYOS_CLIENT';

export const PayosProvider: Provider = {
  provide: PAYOS_CLIENT,
  useFactory: (config: ConfigService) => {
    const clientId = config.get<string>('PAYOS_CLIENT_ID');
    const apiKey = config.get<string>('PAYOS_API_KEY');
    const checksumKey = config.get<string>('PAYOS_CHECKSUM_KEY');

    if (!clientId || !apiKey || !checksumKey) {
      console.warn('Cảnh báo: Cấu hình PayOS chưa đầy đủ trong .env!');
    }

    return new PayOS({ clientId: clientId ?? '', apiKey: apiKey ?? '', checksumKey: checksumKey ?? '' });
  },
  inject: [ConfigService],
};