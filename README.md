# CampusFoodLink

A mobile-friendly campus dining platform for ordering food from campus vendors.

## Setup instructions

### Prerequisites
- Install Git: https://git-scm.com/
- Install Node.js (LTS version): https://nodejs.org/

### Steps
1. Clone the repository: 
    `git clone https://github.com/Alexander7The7Great/CampusFoodLink.git`

2. Navigate into the back_end folder:
    `cd back_end`

3. Install dependencies:
    `npm install`

4. Create a `.env` file in the root folder (same level where front_end, back_end, database lives) with the following:
    `SESSION_SECRET=secret`

5. Start the server:
    `npm run devStart`

6. Open your browser and go to: 
    `localhost:3000/login`

## Test Login
You can log in with a sample account:
-Email: Jake.torres@university.edu
-Password: Hashed_pw_1

## How it Works
CampusFoodLink uses Node.js, Express, and SQLite. Students log in, browse vendor menus, add items to their cart, and place orders. 
Vendors can view and manage incoming orders. The system tracks meal plan balances and deducts them automatically when an order is placed. 