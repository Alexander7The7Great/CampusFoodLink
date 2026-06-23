//get the student profile for the user from the database
async function getStudentProfile(db, userId) {
    return db.get('SELECT * FROM student_profile WHERE user_id = ?',
    [userId])
}

//get the meal plan balance of the user and the associated student profile
async function getMealPlanBalance(db, UserId) {
    const studProf = await getStudentProfile(db, UserId)
    return studProf.meal_plan_balance
}

//create a row in the transactions logs table showing the change in the balance (We can also use this for adding
//balances into the student account later)
async function logTransaction(db, studentId, oldValue, newValue, time) {
    await db.run(
        'INSERT INTO transaction_log(student_id, old_value, new_value, timestamp) VALUES (?, ?, ?, ?)',
        [studentId, oldValue, newValue, time]) 
}


//function to take from the balance of the student when orders are placed (We can have this do the opposite
//for when admins add funds to the student balance)
async function deductMealBalance(db, userId, amount, time) {
    const studProf = await getStudentProfile(db, userId)
    const oldValue = studProf.meal_plan_balance
    const newValue = oldValue - amount

    await db.run('UPDATE student_profile SET meal_plan_balance = ? WHERE student_id = ?',
    [newValue, studProf.Student_id])


    await logTransaction(db, studProf.Student_id, oldValue, newValue, time)

    //return the studentid so it can be used in functions like the order creation much mroe easily
    return { studentId: studProf.Student_id }
    }


//export the modules out for use in other files
module.exports = {
    getMealPlanBalance,
    getStudentProfile,
    logTransaction,
    deductMealBalance
}