const {Exchange, Exchanges} = require('../models/exchange.model');
const queue = require('../redis').queue;
/**
 * Load exchange and append to req.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @param {*} id - The id of the exchange to load.
 */
function load(req, res, next, id) {
  Exchange.get(id)
    .then((exchange) => {
      req.exchange = exchange; // eslint-disable-line no-param-reassign
      return next();
    })
    .catch((e) => next(e));
}

/**
 * Get exchange
 * @param {*} req
 * @param {*} res
 * @returns {Exchange}
 */
function get(req, res) {
  return res.json(req.exchange);
}

/**
 * Create new exchange
 * @param {*} req
 * @param {*} res
 * @param {Function} next - Called when complete.
 */
function create(req, res, next) {
  Exchange.create(
    {
      name: req.body.name,
      config: req.body.config,
      enabled: req.body.enabled !== undefined ? req.body.enabled : true
    })
    .then((exchange) => {
      const refreshExchanges = queue
        .createJob('refreshExchanges', {})
        .priority('high')
        .removeOnComplete( true )
        .save();
      queue.now(refreshExchanges);
      return res.json(exchange.toJSON());
    })
    .catch((e) => {
      next(e);
    });
}

/**
 * Update existing exchange.
 * @param {*} req
 * @param {*} res
 * @param {Function} next - Called when complete.
 */
function update(req, res, next) {
  Exchange
    .update(req.body, {id: req.exchange.id})
    .then((savedExchange) => {
      const refreshExchanges = queue
        .createJob('refreshExchanges', {})
        .unique('refreshExchanges')
        .priority('high');
      queue.now(refreshExchanges);
      return res.json(savedExchange);
    })
    .catch((e) => next(e));
}

/**
 * Get exchange list.
 * @param {*} req
 * @param {*} res
 * @param {Function} next - Called when complete.
 */
function list(req, res, next) {
  Exchanges.list()
    .then((exchanges) => res.json(exchanges))
    .catch((e) => next(e));
}

/**
 * Delete exchange.
 * @param {*} req
 * @param {*} res
 * @param {Function} next - Called when complete.
 */
function remove(req, res, next) {
  const exchange = req.exchange;
  Exchange.destroy(exchange)
    .then((deletedExchange) => res.json(deletedExchange))
    .catch((e) => next(e));
}

module.exports = {load, get, create, update, list, remove};
