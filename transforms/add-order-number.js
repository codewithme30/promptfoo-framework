/**
 * Author  : Anil Kalisetti
 * File    : transforms/add-order-number.js
 * Purpose : transformVars example. Derives a formatted order number and the
 *           final customer question from a raw numeric `order_id`, the way a
 *           real order system pads ids to a fixed width.
 *
 * Input  : { order_id: 1234 }
 * Output : { order_id: 1234, order_number: 'ORD-00001234', query: 'Where is my order ORD-00001234?' }
 */
'use strict';

const ORDER_ID_WIDTH = 8;

module.exports = (vars) => {
  const orderNumber = `ORD-${String(vars.order_id).padStart(ORDER_ID_WIDTH, '0')}`;
  return { ...vars, order_number: orderNumber, query: `Where is my order ${orderNumber}?` };
};
