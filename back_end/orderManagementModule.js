async function createOrder(db, studID, venID, orderTotal, time, order) {
    const result = await db.run('
    INSERT INTO "order"(student_id, vendor_id, order_total, time_created) VALUES(?, ?, ?, ?)'
    [studID, venID, orderTotal, time]
    )

    const orderID = result.lastID

    for (const item of order) {
        await db.run('INSERT INTO order_item (order_id, item_id, amount) VALUES (?, ?, ?',
        [orderId, item.id, item.amount])
    }

    await db.run('INSERT INTO order_status_history (order_id, status, changed_at) VALUES (?, ?, ?',
        [orderId, 'Pending', time])

    return orderId
}

module.exports = { createOrder }