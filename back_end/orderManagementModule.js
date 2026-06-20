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

module.exports = { createOrder }