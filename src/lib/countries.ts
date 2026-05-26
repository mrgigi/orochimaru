export interface Country {
  code: string;
  name: string;
  flag: string;
  label: string;
}

export const COUNTRIES: Country[] = [
  // Middle East
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', label: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', label: 'KSA' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', label: 'TUR' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', label: 'QAT' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', label: 'KUW' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', label: 'OMA' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', label: 'BAH' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', label: 'ISR' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', label: 'JOR' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', label: 'LBN' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', label: 'IRQ' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', label: 'IRN' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', label: 'SYR' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', label: 'YEM' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', label: 'PSE' },

  // Africa
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', label: 'NGA' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', label: 'RSA' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', label: 'EGY' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', label: 'KEN' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', label: 'GHA' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', label: 'MAR' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', label: 'ETH' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', label: 'ALG' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', label: 'TAN' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', label: 'UGA' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', label: 'ANG' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', label: 'CIV' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', label: 'SEN' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', label: 'CMR' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', label: 'TUN' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', label: 'ZIM' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', label: 'RWA' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', label: 'MRI' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', label: 'ZAM' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾', label: 'LBY' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', label: 'SUD' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', label: 'SOM' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', label: 'MAD' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', label: 'MOZ' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦', label: 'NAM' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', label: 'BOT' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', label: 'MLI' },
  { code: 'CD', name: 'DR Congo', flag: '🇨🇩', label: 'COD' },
  { code: 'CG', name: 'Congo Republic', flag: '🇨🇬', label: 'COG' },

  // North America
  { code: 'US', name: 'United States', flag: '🇺🇸', label: 'USA' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', label: 'CAN' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', label: 'MEX' },

  // Europe
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', label: 'UK' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', label: 'GER' },
  { code: 'FR', name: 'France', flag: '🇫🇷', label: 'FRA' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', label: 'ESP' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', label: 'ITA' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', label: 'NED' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', label: 'SUI' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', label: 'SWE' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', label: 'RUS' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', label: 'UKR' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', label: 'POL' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', label: 'NOR' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', label: 'DEN' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', label: 'FIN' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', label: 'IRL' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', label: 'POR' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', label: 'BEL' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', label: 'AUT' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', label: 'GRE' },

  // Asia
  { code: 'JP', name: 'Japan', flag: '🇯🇵', label: 'JPN' },
  { code: 'IN', name: 'India', flag: '🇮🇳', label: 'IND' },
  { code: 'CN', name: 'China', flag: '🇨🇳', label: 'CHN' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', label: 'SGP' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', label: 'KOR' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', label: 'INA' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', label: 'VIE' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', label: 'PHI' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', label: 'MAS' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', label: 'THA' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', label: 'PAK' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', label: 'BAN' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', label: 'SRI' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', label: 'KAZ' },

  // Oceania
  { code: 'AU', name: 'Australia', flag: '🇦🇺', label: 'AUS' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', label: 'NZL' },

  // South / Central America
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', label: 'BRA' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', label: 'ARG' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', label: 'COL' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', label: 'CHI' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', label: 'PER' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', label: 'VEN' },

  // Other
  { code: 'OTHER', name: 'Other / Secret', flag: '🌍', label: 'GLO' }
];

export const COUNTRY_MAP: Record<string, { flag: string; label: string }> = COUNTRIES.reduce(
  (acc, country) => {
    acc[country.code] = { flag: country.flag, label: country.label };
    return acc;
  },
  {} as Record<string, { flag: string; label: string }>
);
