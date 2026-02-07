import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, locationForRun, titleForRun } from '@/utils/utils';
import { COUNTRY_STANDARDIZATION } from '@/static/city';

const standardizeCountryName = (country: string): string => {
  for (const [pattern, standardName] of COUNTRY_STANDARDIZATION) {
    if (country.includes(pattern)) {
      return standardName;
    }
  }
  return country;
};

const useActivities = () => {
  const { id } = useParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const queryUser = searchParams.get('user');
  
  // Priority: Query Param > Route Param > Default Env
  const userId = queryUser ?? id ?? (import.meta.env.VITE_DEFAULT_USER_ID as string | undefined);

  useEffect(() => {
    let isMounted = true;

    const fetchActivities = async () => {
      if (!userId) {
        if (isMounted) {
          // If no user, maybe try to load a default global activities.json if it exists?
          // Or just show error.
          // For backward compatibility with single-user mode:
          // Try loading `activities.json` from root if no user is specified?
          // But existing logic sets Error.
          
          // Let's try to load root activities.json if userId is missing, assuming single user mode fallback.
           try {
              const response = await fetch(`${import.meta.env.BASE_URL ?? '/'}activities.json`);
              if (response.ok) {
                 const data = await response.json();
                 if (isMounted) setActivities(data);
                 setLoading(false);
                 return;
              }
           } catch (e) {}
           
          setError('Missing user id. Use ?user=Name or /users/Name.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const baseUrl = import.meta.env.BASE_URL ?? '/';
      const basePath = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
      
      // Support my new script output location: /data/{userId}/activities.json
      // AND potential legacy location /users/{userId}/activities.json
      
      const urlsToTry = [
          `${basePath}/data/${userId}/activities.json`,
          `${basePath}/users/${userId}/activities.json`
      ];

      try {
        let response;
        for (const url of urlsToTry) {
            try {
                response = await fetch(url, { cache: 'no-cache' });
                if (response.ok) break;
            } catch (e) {}
        }

        if (!response || !response.ok) {
          throw new Error(`Failed to load activities for user ${userId}.`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid activities payload.');
        }
        if (isMounted) {
          setActivities(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActivities();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const processedData = useMemo(() => {
    const cities: Record<string, number> = {};
    const runPeriod: Record<string, number> = {};
    const provinces: Set<string> = new Set();
    const countries: Set<string> = new Set();
    const years: Set<string> = new Set();

    activities.forEach((run) => {
      const location = locationForRun(run);

      const periodName = titleForRun(run);
      if (periodName) {
        runPeriod[periodName] = runPeriod[periodName]
          ? runPeriod[periodName] + 1
          : 1;
      }

      const { city, province, country } = location;
      // drop only one char city
      if (city.length > 1) {
        cities[city] = cities[city]
          ? cities[city] + run.distance
          : run.distance;
      }
      if (province) provinces.add(province);
      if (country) countries.add(standardizeCountryName(country));
      const year = run.start_date_local.slice(0, 4);
      years.add(year);
    });

    const yearsArray = [...years].sort().reverse();
    const thisYear = yearsArray[0] || '';

    return {
      activities,
      years: yearsArray,
      countries: [...countries],
      provinces: [...provinces],
      cities,
      runPeriod,
      thisYear,
    };
  }, [activities]);

  return { ...processedData, loading, error, userId };
};

export default useActivities;
