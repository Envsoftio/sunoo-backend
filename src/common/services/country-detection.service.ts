import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../../entities/plan.entity';

@Injectable()
export class CountryDetectionService {
  private readonly logger = new Logger(CountryDetectionService.name);

  constructor(
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>
  ) {}

  // Default supported countries mapping (fallback)
  private readonly defaultSupportedCountries = {
    US: { name: 'United States', currency: 'USD' },
    CA: { name: 'Canada', currency: 'CAD' },
    AU: { name: 'Australia', currency: 'AUD' },
    IN: { name: 'India', currency: 'INR' },
    PK: { name: 'Pakistan', currency: 'PKR' },
    NZ: { name: 'New Zealand', currency: 'NZD' },
    GB: { name: 'United Kingdom', currency: 'GBP' },
    DE: { name: 'Germany', currency: 'EUR' },
    FR: { name: 'France', currency: 'EUR' },
  };

  // IP API providers configuration
  private readonly ipProviders = [
    {
      name: 'ipapi.co',
      url: (ip: string) => `https://ipapi.co/${ip}/json/`,
      timeout: 3000,
      parseResponse: (data: any) => ({
        countryCode: data.country_code,
        countryName: data.country_name,
      }),
      priority: 1, // Higher priority = tried first
    },
    {
      name: 'ip-api.com',
      url: (ip: string) =>
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode`,
      timeout: 3000,
      parseResponse: (data: any) => ({
        countryCode: data.countryCode,
        countryName: data.country,
      }),
      priority: 2,
    },
    {
      name: 'ipinfo.io',
      url: (ip: string) => `https://ipinfo.io/${ip}/json`,
      timeout: 3000,
      parseResponse: (data: any) => ({
        countryCode: data.country,
        countryName: data.country,
      }),
      priority: 3,
    },
    {
      name: 'ipgeolocation.io',
      url: (ip: string) =>
        `https://api.ipgeolocation.io/ipgeo?apiKey=free&ip=${ip}`,
      timeout: 3000,
      parseResponse: (data: any) => ({
        countryCode: data.country_code2,
        countryName: data.country_name,
      }),
      priority: 4,
    },
    {
      name: 'ipapi.com',
      url: (ip: string) => `https://ipapi.com/${ip}/json/`,
      timeout: 3000,
      parseResponse: (data: any) => ({
        countryCode: data.country_code,
        countryName: data.country_name,
      }),
      priority: 5,
    },
  ];

  // Get supported countries from plans table
  private async getSupportedCountriesFromPlans() {
    try {
      const plans = await this.planRepository.find({
        select: ['currency'],
        where: { liveMode: true },
      });

      const currencies = [
        ...new Set(plans.map(plan => plan.currency).filter(Boolean)),
      ];

      // Map currencies to countries
      const currencyToCountryMap = {
        USD: { name: 'United States', countryCode: 'US' },
        CAD: { name: 'Canada', countryCode: 'CA' },
        AUD: { name: 'Australia', countryCode: 'AU' },
        INR: { name: 'India', countryCode: 'IN' },
        PKR: { name: 'Pakistan', countryCode: 'PK' },
        NZD: { name: 'New Zealand', countryCode: 'NZ' },
        GBP: { name: 'United Kingdom', countryCode: 'GB' },
        EUR: { name: 'Germany', countryCode: 'DE' },
        SGD: { name: 'Singapore', countryCode: 'SG' },
      };

      const supportedCountries: Record<
        string,
        { name: string; currency: string }
      > = {};
      currencies.forEach(currency => {
        if (currency) {
          const countryInfo =
            currencyToCountryMap[currency as keyof typeof currencyToCountryMap];
          if (countryInfo) {
            supportedCountries[countryInfo.countryCode] = {
              name: countryInfo.name,
              currency: currency,
            };
          }
        }
      });

      return supportedCountries;
    } catch (error) {
      this.logger.warn(
        'Failed to get supported countries from plans, using defaults:',
        error.message
      );
      return this.defaultSupportedCountries;
    }
  }

  /**
   * Detect user's country using multiple fallback methods
   * @param clientIP - Optional client IP address
   * @param userAgent - Optional user agent string
   * @returns Promise with country information
   */
  async detectCountry(
    clientIP?: string,
    _userAgent?: string
  ): Promise<{
    country: string;
    countryCode: string;
    currency: string;
    source: 'ipapi' | 'timezone' | 'fallback';
  }> {
    // Get supported countries from plans table
    const supportedCountries = await this.getSupportedCountriesFromPlans();

    // Method 1: Try IP-based detection first
    if (clientIP) {
      try {
        const ipResult = await this.detectCountryByIP(
          clientIP,
          supportedCountries
        );
        if (ipResult) {
          this.logger.log(`Country detected via IP: ${ipResult.country}`);
          return { ...ipResult, source: 'ipapi' };
        }
      } catch (error) {
        this.logger.warn(`IP-based country detection failed: ${error.message}`);
      }
    }

    // Method 2: Try timezone-based detection
    try {
      const timezoneResult = this.detectCountryByTimezone(supportedCountries);
      if (timezoneResult) {
        this.logger.log(
          `Country detected via timezone: ${timezoneResult.country}`
        );
        return { ...timezoneResult, source: 'timezone' };
      }
    } catch (error) {
      this.logger.warn(
        `Timezone-based country detection failed: ${error.message}`
      );
    }

    // Method 3: Fallback to default (first supported country)
    const defaultCountry =
      Object.values(supportedCountries)[0] || this.defaultSupportedCountries.US;
    this.logger.log('Using fallback country detection');
    return {
      country: defaultCountry.name,
      countryCode:
        Object.keys(supportedCountries).find(
          key => supportedCountries[key].name === defaultCountry.name
        ) || 'US',
      currency: defaultCountry.currency,
      source: 'fallback',
    };
  }

  /**
   * Detect country using multiple IP API providers as fallbacks
   */
  private async detectCountryByIP(
    ip: string,
    supportedCountries: Record<string, { name: string; currency: string }>
  ): Promise<{
    country: string;
    countryCode: string;
    currency: string;
  } | null> {
    // Sort providers by priority (lower number = higher priority)
    const providers = [...this.ipProviders].sort(
      (a, b) => a.priority - b.priority
    );

    for (const provider of providers) {
      try {
        this.logger.log(`Trying IP provider: ${provider.name}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          provider.timeout
        );

        const response = await fetch(provider.url(ip), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'SunooApp/1.0',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const parsed = provider.parseResponse(data);

        if (!parsed.countryCode) {
          throw new Error('No country code in response');
        }

        const countryInfo = supportedCountries[parsed.countryCode];

        if (countryInfo) {
          this.logger.log(
            `Country detected via ${provider.name}: ${countryInfo.name}`
          );
          return {
            country: countryInfo.name,
            countryCode: parsed.countryCode,
            currency: countryInfo.currency,
          };
        }

        // If country not in supported list, return the first supported country
        const firstSupportedCountry = Object.values(supportedCountries)[0] as {
          name: string;
          currency: string;
        };
        this.logger.log(
          `Country ${parsed.countryCode} not supported, using ${firstSupportedCountry.name}`
        );
        return {
          country: firstSupportedCountry.name,
          countryCode:
            Object.keys(supportedCountries).find(
              key => supportedCountries[key].name === firstSupportedCountry.name
            ) || 'US',
          currency: firstSupportedCountry.currency,
        };
      } catch (error) {
        this.logger.warn(`IP provider ${provider.name} failed:`, error.message);
        continue; // Try next provider
      }
    }

    this.logger.error('All IP providers failed');
    return null;
  }

  /**
   * Detect country using timezone
   */
  private detectCountryByTimezone(
    supportedCountries: Record<string, { name: string; currency: string }>
  ): {
    country: string;
    countryCode: string;
    currency: string;
  } | null {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Timezone to country mapping
      const timezoneMap = {
        'America/New_York': 'US',
        'America/Chicago': 'US',
        'America/Denver': 'US',
        'America/Los_Angeles': 'US',
        'America/Phoenix': 'US',
        'America/Anchorage': 'US',
        'Pacific/Honolulu': 'US',
        'America/Toronto': 'CA',
        'America/Vancouver': 'CA',
        'America/Edmonton': 'CA',
        'America/Winnipeg': 'CA',
        'America/Halifax': 'CA',
        'America/St_Johns': 'CA',
        'Asia/Kolkata': 'IN',
        'Asia/Calcutta': 'IN',
        'Asia/Karachi': 'PK',
        'Australia/Sydney': 'AU',
        'Australia/Melbourne': 'AU',
        'Australia/Brisbane': 'AU',
        'Australia/Perth': 'AU',
        'Australia/Adelaide': 'AU',
        'Australia/Darwin': 'AU',
        'Pacific/Auckland': 'NZ',
        'Europe/London': 'GB',
        'Europe/Berlin': 'DE',
        'Europe/Paris': 'FR',
        'Asia/Singapore': 'SG',
      };

      const countryCode = timezoneMap[timezone];
      if (countryCode && supportedCountries[countryCode]) {
        const countryInfo = supportedCountries[countryCode];
        return {
          country: countryInfo.name,
          countryCode,
          currency: countryInfo.currency,
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Timezone-based detection failed:', error.message);
      return null;
    }
  }

  /**
   * Get supported countries list
   */
  async getSupportedCountries() {
    return await this.getSupportedCountriesFromPlans();
  }

  /**
   * Get IP provider statistics and health status
   */
  async getProviderHealthStatus() {
    const testIP = '8.8.8.8'; // Google's public DNS
    const results: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      responseTime: number | null;
      countryCode?: string;
      error?: string;
      priority: number;
    }> = [];

    for (const provider of this.ipProviders) {
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          provider.timeout
        );

        const response = await fetch(provider.url(testIP), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'SunooApp/1.0',
          },
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (response.ok) {
          const data = await response.json();
          const parsed = provider.parseResponse(data);

          results.push({
            name: provider.name,
            status: 'healthy',
            responseTime: responseTime,
            countryCode: parsed.countryCode,
            priority: provider.priority,
          });
        } else {
          results.push({
            name: provider.name,
            status: 'unhealthy',
            responseTime: responseTime,
            error: `HTTP ${response.status}`,
            priority: provider.priority,
          });
        }
      } catch (error) {
        results.push({
          name: provider.name,
          status: 'unhealthy',
          responseTime: null,
          error: error.message,
          priority: provider.priority,
        });
      }
    }

    return {
      success: true,
      data: {
        providers: results,
        healthyProviders: results.filter(p => p.status === 'healthy').length,
        totalProviders: results.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Check if a country is supported
   */
  async isCountrySupported(countryCode: string): Promise<boolean> {
    const supportedCountries = await this.getSupportedCountriesFromPlans();
    return countryCode in supportedCountries;
  }

  /**
   * Get currency for a country code
   */
  async getCurrencyForCountry(countryCode: string): Promise<string> {
    const supportedCountries = await this.getSupportedCountriesFromPlans();
    return supportedCountries[countryCode]?.currency || 'USD';
  }
}
