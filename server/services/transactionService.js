const mongoose = require('mongoose');

const isTransactionUnsupported = (error) =>
  error?.code === 20 ||
  /Transaction numbers are only allowed on a replica set member or mongos/i.test(error?.message || '');

/**
 * Run a multi-document mutation atomically when MongoDB supports transactions.
 * Local standalone MongoDB remains supported for existing installations, but
 * administrators should use a replica set to receive atomic guarantees.
 */
exports.runAtomic = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      if (!isTransactionUnsupported(error)) throw error;

      console.warn(
        '[Transactions] MongoDB is running without transaction support. Retrying without a session; configure a replica set for atomic writes.'
      );
      return await work(null);
    }
  } finally {
    await session.endSession();
  }
};
