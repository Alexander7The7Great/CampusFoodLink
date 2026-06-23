//will need to pull the deduct function in order to have the amount taken from the account and a transaction log created along with it
const { deductMealBalance } = require('./mealPlanTransactionsModule')


async function createOrder(db, userId, venID, orderTotal, time, order) {

    const { studentId } = await deductMealBalance(db, userId, orderTotal, time)

    const result = await db.run('INSERT INTO "order" (student_id, vendor_id, order_total, time_created) VALUES (?, ?, ?, ?)',
    [studentId, venID, orderTotal, time]
    )

    const orderID = result.lastID

    for (const item of order) {
        await db.run('INSERT INTO order_item (order_id, item_id, amount) VALUES (?, ?, ?)',
        [orderID, item.id, item.amount])
    }

    await db.run('INSERT INTO order_status_history (order_id, status, changed_at) VALUES (?, ?, ?)',
        [orderID, 'Pending', time])

    return orderID
}

async function getActiveOrders(db, studentId) {
    return db.all(
        `SELECT o.order_id, o.order_total, v.vendor_name,
                osh.status
         FROM "order" o
         JOIN vendor v ON o.vendor_id = v.vendor_id
         JOIN order_status_history osh ON osh.history_id = (
             SELECT history_id
             FROM order_status_history
             WHERE order_id = o.order_id
             ORDER BY changed_at DESC
             LIMIT 1
         )
         WHERE o.student_id = ? AND osh.status != 'Ready'
         ORDER BY osh.changed_at DESC` ,
         [studentId]
    )
}

module.exports = { createOrder, getActiveOrders }