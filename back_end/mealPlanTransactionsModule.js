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


//export the modules out for use in other files
module.exports = {
    getMealPlanBalance
}