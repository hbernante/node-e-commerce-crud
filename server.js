// Load environment variables
require('dotenv').config();

const apiUrl = process.env.API_URL || 'http://localhost:3000';

const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'assets')));

// Azure SQL Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Convert string to boolean
  },
};

// Add a route to expose the `apiUrl` for client-side use
// app.get("/config", (req, res) => {
//   res.json({ apiUrl });
// });

// server.js
app.get('/config', (req, res) => {
  res.json({ API_URL: process.env.API_URL });
});



// API for Users
app.get("/users", async (req, res) => {
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool.request().query("SELECT * FROM Users");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/users", async (req, res) => {
  const { Name, Email } = req.body;
  if (!Name || !Email) {
    return res.status(400).send("Name and Email are required");
  }
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool
      .request()
      .query(
        "SELECT ISNULL(MAX(CAST(CustomerID AS INT)), 0) AS MaxCustomerID FROM Users"
      );
    let maxCustomerID = result.recordset[0].MaxCustomerID;
    let newCustomerID = String(maxCustomerID + 1).padStart(4, "0");
    await pool
      .request()
      .input("Name", sql.NVarChar, Name)
      .input("Email", sql.NVarChar, Email)
      .input("CustomerID", sql.NVarChar, newCustomerID)
      .query(
        "INSERT INTO Users (Name, Email, CustomerID) VALUES (@Name, @Email, @CustomerID)"
      );
    res.status(201).send("User added successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// **Added PUT route for updating users**
app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { Name, Email, CustomerID } = req.body;

  if (!Name || !Email || !CustomerID) {
    return res.status(400).send("Name, Email, and CustomerID are required");
  }

  try {
    let pool = await sql.connect(dbConfig);

    // Update the user in the database
    let result = await pool
      .request()
      .input("ID", sql.Int, id)
      .input("Name", sql.NVarChar, Name)
      .input("Email", sql.NVarChar, Email)
      .input("CustomerID", sql.NVarChar, CustomerID)
      .query(
        "UPDATE Users SET Name = @Name, Email = @Email, CustomerID = @CustomerID WHERE ID = @ID"
      );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("User not found");
    }

    res.send("User updated successfully");
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).send("Internal server error");
  }
});

// Delete a user and their orders
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    let pool = await sql.connect(dbConfig);

    // First, delete related orders
    await pool
      .request()
      .input("CustomerID", sql.Int, id)
      .query("DELETE FROM Orders WHERE CustomerID = @CustomerID");

    // Now, delete the user
    let result = await pool
      .request()
      .input("UserID", sql.Int, id)
      .query("DELETE FROM Users WHERE ID = @UserID");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("User not found");
    }

    res.send("User and their orders deleted successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// API for Products
app.get("/products", async (req, res) => {
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool.request().query("SELECT * FROM Product");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Add a new product
app.post("/products", async (req, res) => {
  const { ProductName, Description, Quantity, Price } = req.body;
  if (!ProductName || Price === undefined) {
    return res.status(400).send("ProductName and Price are required");
  }

  try {
    let pool = await sql.connect(dbConfig);
    await pool
      .request()
      .input("ProductName", sql.NVarChar, ProductName)
      .input("Description", sql.NVarChar, Description)
      .input("Quantity", sql.Int, Quantity)
      .input("Price", sql.Decimal(10, 2), Price)
      .query(
        "INSERT INTO Product (ProductName, Description, Quantity, Price) VALUES (@ProductName, @Description, @Quantity, @Price)"
      );
    res.status(201).send("Product added successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Update an existing product
app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { ProductName, Description, Quantity, Price } = req.body;

  if (!ProductName || Price === undefined) {
    return res.status(400).send("ProductName and Price are required");
  }

  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool
      .request()
      .input("ProductID", sql.Int, id)
      .input("ProductName", sql.NVarChar, ProductName)
      .input("Description", sql.NVarChar, Description)
      .input("Quantity", sql.Int, Quantity)
      .input("Price", sql.Decimal(10, 2), Price)
      .query(
        "UPDATE Product SET ProductName = @ProductName, Description = @Description, Quantity = @Quantity, Price = @Price WHERE ProductID = @ProductID"
      );
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("Product not found");
    }
    res.send("Product updated successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Delete a product
app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool
      .request()
      .input("ProductID", sql.Int, id)
      .query("DELETE FROM Product WHERE ProductID = @ProductID");
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("Product not found");
    }
    res.send("Product deleted successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// API for Orders

// GET route for fetching all orders
app.get("/orders", async (req, res) => {
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool.request().query(`
      SELECT o.OrderID, o.CustomerID, o.OrderDate, o.ProductName, o.TotalQuantity, o.TotalPrice, o.Status
      FROM Orders o
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET route for fetching a specific order by orderID
app.get("/orders/:orderID", async (req, res) => {
  const { orderID } = req.params;
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool.request().input("OrderID", sql.Int, orderID).query(`
        SELECT o.OrderID, o.CustomerID, o.OrderDate, o.ProductName, o.TotalQuantity, o.TotalPrice, o.Status
        FROM Orders o
        WHERE o.OrderID = @OrderID
      `);
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]); // Send back the order if it exists
    } else {
      res.status(404).send("Order not found");
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// POST route for adding a new order
app.post("/orders", async (req, res) => {
  const {
    OrderDate,
    CustomerID,
    ProductID,
    ProductName,
    TotalQuantity,
    TotalPrice,
    Status,
  } = req.body;
  if (
    !OrderDate ||
    !CustomerID ||
    !ProductID ||
    !TotalQuantity ||
    !TotalPrice ||
    !Status
  ) {
    return res.status(400).send("Missing required fields");
  }
  try {
    let pool = await sql.connect(dbConfig);
    await pool
      .request()
      .input("OrderDate", sql.Date, OrderDate)
      .input("CustomerID", sql.NVarChar, CustomerID)
      .input("ProductID", sql.Int, ProductID || null) // Allow ProductID to be null
      .input("ProductName", sql.NVarChar, ProductName || "") // Default empty string if no product
      .input("TotalQuantity", sql.Int, TotalQuantity)
      .input("TotalPrice", sql.Decimal, TotalPrice)
      .input("Status", sql.NVarChar, Status).query(`
              INSERT INTO Orders (OrderDate, CustomerID, ProductID, ProductName, TotalQuantity, TotalPrice, Status)
              VALUES (@OrderDate, @CustomerID, @ProductID, @ProductName, @TotalQuantity, @TotalPrice, @Status)
          `);
    res.status(201).send("Order added successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/// PUT route to update an order's status
app.put("/orders/:orderID", async (req, res) => {
  const { orderID } = req.params;
  const { Status } = req.body;

  // Ensure that a valid status is provided
  const validStatuses = ['Pending', 'Shipped', 'Delivered'];
  if (!validStatuses.includes(Status)) {
    return res.status(400).send("Invalid status");
  }

  try {
    let pool = await sql.connect(dbConfig);
    
    // Update the order status
    await pool
      .request()
      .input("Status", sql.NVarChar, Status)
      .input("OrderID", sql.Int, orderID)
      .query(`
        UPDATE Orders
        SET Status = @Status
        WHERE OrderID = @OrderID
      `);

    // Fetch the updated order to send it back in the response
    const result = await pool
      .request()
      .input("OrderID", sql.Int, orderID)
      .query(`
        SELECT OrderID, CustomerID, OrderDate, ProductName, TotalQuantity, TotalPrice, Status
        FROM Orders
        WHERE OrderID = @OrderID
      `);

    res.status(200).json(result.recordset[0]);  // Send back the updated order data
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// DELETE route to delete an order
app.delete("/orders/:orderID", async (req, res) => {
  const { orderID } = req.params;
  try {
    let pool = await sql.connect(dbConfig);
    await pool
      .request()
      .input("OrderID", sql.Int, orderID)
      .query("DELETE FROM Orders WHERE OrderID = @OrderID");
    res.status(200).send("Order deleted successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Listen on the configured port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${apiUrl}`);
});
