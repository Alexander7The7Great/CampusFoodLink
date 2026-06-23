//will need to pull the deduct function in order to have the amount taken from the account and a transaction log created along with it
const { deductMealBalance } = require('./mealPlanTransactionsModule')

//create the order with the associated status, order items, and transaction log.
async function createOrder(db, userId, venID, orderTotal, time, order) {

    //deduct student meal plan balance, also use it to return studentId for the rest of the function
    const { studentId } = await deductMealBalance(db, userId, orderTotal, time)

    //creates a new role in the order table for the student and the vendor that the order was created with
    const result = await db.run('INSERT INTO "order" (student_id, vendor_id, order_total, time_created) VALUES (?, ?, ?, ?)',
    [studentId, venID, orderTotal, time]
    )

    //store the id of the order so it can be used to create the status and item rows
    const orderID = result.lastID

    //loop through the items of the order so they can each have a row created for them so there is away to see what items were in an order, and how many of each
    for (const item of order) {
        await db.run('INSERT INTO order_item (order_id, item_id, amount) VALUES (?, ?, ?)',
        [orderID, item.id, item.amount])
    }

    //create the initial order status row with the starting pending status
    await db.run('INSERT INTO order_status_history (order_id, status, changed_at) VALUES (?, ?, ?)',
        [orderID, 'Pending', time])
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