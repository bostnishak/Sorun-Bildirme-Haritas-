import { verifyCitizenIdentity } from '../../services/nvi.service';
import opossum from 'opossum';

jest.mock('opossum');
jest.mock('soap', () => ({
  createClientAsync: jest.fn().mockResolvedValue({
    KPSPublic: {
      KPSPublicSoap: {
        TCKimlikNoDogrulaAsync: jest.fn().mockResolvedValue([{ TCKimlikNoDogrulaResult: true }])
      }
    }
  })
}));

describe('NVI Service', () => {
  it('should bypass NVI if bypassed is true', async () => {
    // circuit breaker mock
    (opossum as jest.Mock).mockImplementation(() => ({
      fire: jest.fn().mockResolvedValue({ bypassed: true, reason: 'Circuit is open' }),
      on: jest.fn(),
      stats: { failures: 0, successes: 0 }
    }));

    const result = await verifyCitizenIdentity({
      tcKimlikNo: '11111111110',
      firstName: 'AHMET',
      lastName: 'YILMAZ',
      birthYear: 1990
    });

    expect(result).toEqual({ bypassed: true, reason: 'Circuit is open' });
  });
});
