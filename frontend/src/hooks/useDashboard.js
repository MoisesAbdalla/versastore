import { useCallback, useEffect, useState } from "react";

import {
  getOverviewStats,
  getSalesSeries,
  getTopProducts,
  getRecentOrders,
  getAlerts,
} from "../services/dashboardService";

// Carrega a visão geral: cards/recentes/alertas uma vez, série + top-5 a cada
// mudança de período ({from, to} em chaves yyyy-mm-dd).
export function useDashboard(period) {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [series, setSeries] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [overview, recent, alertData] = await Promise.all([
        getOverviewStats(),
        getRecentOrders(5),
        getAlerts(),
      ]);

      setStats(overview);
      setRecentOrders(recent);
      setAlerts(alertData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (!period?.from || !period?.to) {
      return;
    }

    let cancelled = false;

    setSeriesLoading(true);

    Promise.all([
      getSalesSeries(period.from, period.to),
      getTopProducts(period.from, period.to, 5),
    ])
      .then(([seriesData, topData]) => {
        if (!cancelled) {
          setSeries(seriesData);
          setTopProducts(topData);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSeriesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [period?.from, period?.to]);

  return {
    stats,
    recentOrders,
    alerts,
    series,
    topProducts,
    loading,
    seriesLoading,
    error,
    refresh: loadBase,
  };
}
