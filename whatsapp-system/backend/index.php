<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/api/db.php';
    
    // Check if database connection works
    $db_status = "Connected";
    if (isset($pdo)) {
        // Run a simple test query to guarantee connection is fully functional
        $stmt = $pdo->query("SELECT 1");
        $stmt->execute();
    } else {
        $db_status = "Error: PDO connection not established";
    }
} catch (Exception $e) {
    $db_status = "Error: " . $e->getMessage();
}

echo json_encode([
    "status" => "online",
    "message" => "Pavitra Backend API is working",
    "database" => $db_status,
    "timestamp" => date("Y-m-d H:i:s")
], JSON_PRETTY_PRINT);
