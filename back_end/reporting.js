
//This wont work,vendor id isnt in the order history table, and matching preparing and closed order status are needed to actually make this work
//changed it up so the vendor ID can be used, and 
async function getPrepTime(db, venID) {
    const prepTime = await db.all(`
        SELECT
            prep.order_id         AS order_id,
            MIN(prep.changed_at)  AS prep_start,
            MIN(comp.changed_at)  AS prep_end
        FROM order_status_history prep
        JOIN order_status_history comp
            ON comp.order_id = prep.order_id
            AND comp.status = 'Complete'
        JOIN "order" o ON o.order_id = prep.order_id
        WHERE prep.status = 'Preparing' AND o.vendor_id = ?
        GROUP BY prep.order_id
    `, [venID]);

    if (prepTime.length === 0) return 0;


    //add up all the dates to get a total difference between start and end times, and 
    //convert it into minutes to be useful to the vendors and any stats
    const totalMinutes = prepTime.reduce((sum, row) => {
        return sum + (new Date(row.prep_end) - new Date(row.prep_start)) / 60000;
    }, 0);


    //divide by the length of prepTime to get the average minutes that orders take to prep
    return totalMinutes / prepTime.length;
}

module.exports = {
    getPrepTime

}