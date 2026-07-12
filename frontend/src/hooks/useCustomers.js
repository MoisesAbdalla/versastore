import { useCallback } from "react";

import { listCustomers, getCustomer, getCustomerOrders } from "../services/customerService";

// Wrapper fino: listagem paginada + detalhe com histórico de pedidos.
export function useCustomers() {
  const fetchCustomers = useCallback((params) => listCustomers(params), []);
  const fetchCustomer = useCallback((uid) => getCustomer(uid), []);
  const fetchCustomerOrders = useCallback((uid, params) => getCustomerOrders(uid, params), []);

  return { fetchCustomers, fetchCustomer, fetchCustomerOrders };
}
