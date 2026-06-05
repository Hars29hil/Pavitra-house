<?php
// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, ngrok-skip-browser-warning");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Set JSON header by default for API responses (can be overridden for files like qr-image)
header("Content-Type: application/json");

// Helper to load env variables from .env
function loadEnv($path) {
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        if (strpos($line, '=') === false) {
            continue;
        }
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        // Remove quotes if present
        if (preg_match('/^"(.*)"$/', $value, $matches)) {
            $value = $matches[1];
        } elseif (preg_match("/^'(.*)'$/", $value, $matches)) {
            $value = $matches[1];
        }

        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Load .env from backend root
loadEnv(dirname(__DIR__) . '/.env');

$db_host = getenv('DB_HOST') ?: '127.0.0.1';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';
$db_name = getenv('DB_NAME') ?: 'pavitra';

try {
    $dsn = "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database connection failed: " . $e->getMessage()
    ]);
    exit();
}

// Helper to generate UUID v4
function generate_uuid() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Helper to get raw request body parsed as JSON
function get_json_body() {
    $raw = file_get_contents("php://input");
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

// Helper to get base URL
function get_base_url() {
    if (getenv('BACKEND_URL')) {
        return rtrim(getenv('BACKEND_URL'), '/');
    }
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https" : "http";
    if (isset($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
        $protocol = $_SERVER['HTTP_X_FORWARDED_PROTO'];
    }
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    if (isset($_SERVER['HTTP_X_FORWARDED_HOST'])) {
        $host = $_SERVER['HTTP_X_FORWARDED_HOST'];
    }
    return "$protocol://$host";
}

// Logging function to write API access logs (similar to the Node.js logger)
function write_api_log($method, $path, $status_code, $duration_ms, $req_headers, $req_query, $req_body, $res_body) {
    $now = new DateTime();
    $date_str = $now->format('Y-m-d');
    
    $log_dir = dirname(__DIR__) . '/logs';
    if (!file_exists($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    
    $log_file = $log_dir . '/' . $date_str . '_log.log';
    
    // Formatting bodies to string
    $req_body_str = is_string($req_body) ? $req_body : json_encode($req_body);
    $res_body_str = is_string($res_body) ? $res_body : json_encode($res_body);
    
    if (strlen($res_body_str) > 2000) {
        $res_body_str = substr($res_body_str, 0, 2000) . "... [truncated]";
    }
    
    $log_entry = sprintf(
        "[%s] %s %s | Status: %d | Duration: %dms\nRequest Headers: %s\nRequest Query: %s\nRequest Body: %s\nResponse Body: %s\n----------------------------------------------------------------------\n",
        $now->format(DateTime::ATOM),
        $method,
        $path,
        $status_code,
        $duration_ms,
        json_encode($req_headers),
        json_encode($req_query),
        $req_body_str,
        $res_body_str
    );
    
    file_put_contents($log_file, $log_entry, FILE_APPEND);
}
