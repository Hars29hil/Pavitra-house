<?php
require_once __DIR__ . '/db.php';

function proxy_request($target_path) {
    global $pdo;
    
    // Fetch WhatsApp Node service URL from MySQL settings
    try {
        $stmt = $pdo->prepare("SELECT value FROM settings WHERE `key` = 'whatsapp_node_url'");
        $stmt->execute();
        $node_url = $stmt->fetchColumn();
    } catch (Exception $e) {
        $node_url = 'http://localhost:4000';
    }
    
    if (!$node_url) {
        $node_url = 'http://localhost:4000'; // fallback default
    }
    
    $node_url = rtrim($node_url, '/');
    $url = $node_url . $target_path;
    
    // Append query string if present
    if (!empty($_SERVER['QUERY_STRING'])) {
        $url .= '?' . $_SERVER['QUERY_STRING'];
    }
    
    // Initialize cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true); // Include response headers in output
    curl_setopt($ch, CURLOPT_TIMEOUT, 35);
    
    $method = $_SERVER['REQUEST_METHOD'];
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    // Map request headers to forward
    $headers = [];
    foreach (getallheaders() as $name => $value) {
        if (strtolower($name) === 'host') continue; // Let cURL set correct Host
        $headers[] = "$name: $value";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    // Forward payload for POST/PUT requests
    if ($method === 'POST' || $method === 'PUT') {
        $body = file_get_contents('php://input');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    
    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        http_response_code(502);
        header("Content-Type: application/json");
        echo json_encode([
            "success" => false,
            "error" => "Failed to reach WhatsApp service. Make sure the Node.js daemon is running.",
            "details" => curl_error($ch),
            "service_url" => $node_url
        ]);
        curl_close($ch);
        exit();
    }
    
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $response_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // Separate headers and body
    $res_headers = substr($response, 0, $header_size);
    $res_body = substr($response, $header_size);
    
    // Send response status code
    http_response_code($response_code);
    
    // Send response headers (avoiding duplicate CORS or Connection controls)
    $header_lines = explode("\r\n", $res_headers);
    foreach ($header_lines as $line) {
        if (empty($line)) continue;
        if (stripos($line, 'HTTP/') === 0) continue;
        if (stripos($line, 'Transfer-Encoding') === 0) continue;
        if (stripos($line, 'Connection') === 0) continue;
        if (stripos($line, 'Access-Control') === 0) continue; // Let PHP script handle CORS via db.php
        
        header($line);
    }
    
    echo $res_body;
    exit();
}
