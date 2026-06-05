<?php
$start_time = round(microtime(true) * 1000);
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$key = $_GET['key'] ?? '';

$status_code = 200;
$res_body = [];
$req_body = get_json_body();

try {
    if ($method === 'GET') {
        if (empty($key)) {
            // Get all settings
            $stmt = $pdo->query("SELECT `key`, value FROM settings");
            $res_body = $stmt->fetchAll();
        } else {
            // Get a single setting
            $stmt = $pdo->prepare("SELECT value FROM settings WHERE `key` = :key");
            $stmt->execute(['key' => $key]);
            $val = $stmt->fetchColumn();
            
            // Return in a format that's easy to read
            $res_body = [
                "success" => true,
                "key" => $key,
                "value" => $val !== false ? $val : null
            ];
        }
    } else if ($method === 'POST') {
        // Upsert setting
        $s_key = $req_body['key'] ?? $key;
        $s_val = $req_body['value'] ?? '';
        
        if (empty($s_key)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "Key is required"];
        } else {
            $sql = "INSERT INTO settings (`key`, value) VALUES (:key, :value) 
                    ON DUPLICATE KEY UPDATE value = VALUES(value)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'key' => $s_key,
                'value' => $s_val
            ]);
            
            $res_body = [
                "success" => true,
                "key" => $s_key,
                "value" => $s_val
            ];
        }
    } else {
        $status_code = 405;
        $res_body = ["success" => false, "error" => "Method not allowed"];
    }
} catch (Exception $e) {
    $status_code = 500;
    $res_body = ["success" => false, "error" => $e->getMessage()];
}

http_response_code($status_code);
echo json_encode($res_body);

$duration = round(microtime(true) * 1000) - $start_time;
write_api_log(
    $method, 
    $_SERVER['REQUEST_URI'], 
    $status_code, 
    $duration, 
    getallheaders(), 
    $_GET, 
    $req_body, 
    $res_body
);
