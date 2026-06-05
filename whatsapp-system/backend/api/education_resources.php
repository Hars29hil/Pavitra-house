<?php
$start_time = round(microtime(true) * 1000);
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? '';

$status_code = 200;
$res_body = [];
$req_body = get_json_body();

try {
    if ($method === 'GET') {
        if (!empty($id)) {
            $stmt = $pdo->prepare("SELECT * FROM education_resources WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $resource = $stmt->fetch();
            if ($resource) {
                $res_body = $resource;
            } else {
                $status_code = 404;
                $res_body = ["success" => false, "error" => "Resource not found"];
            }
        } else {
            $stmt = $pdo->query("SELECT * FROM education_resources ORDER BY created_at DESC");
            $res_body = $stmt->fetchAll();
        }
    } else if ($method === 'POST') {
        $new_id = generate_uuid();
        
        $title = $req_body['title'] ?? '';
        $type = $req_body['type'] ?? '';
        $url = $req_body['url'] ?? '';
        $description = $req_body['description'] ?? null;
        
        if (empty($title) || empty($type) || empty($url)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "title, type, and url are required"];
        } else if (!in_array($type, ['video', 'link'])) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "type must be 'video' or 'link'"];
        } else {
            $sql = "INSERT INTO education_resources (id, title, type, url, description) 
                    VALUES (:id, :title, :type, :url, :description)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'id' => $new_id,
                'title' => $title,
                'type' => $type,
                'url' => $url,
                'description' => $description
            ]);
            
            // Fetch and return the inserted row
            $stmt = $pdo->prepare("SELECT * FROM education_resources WHERE id = :id");
            $stmt->execute(['id' => $new_id]);
            $res_body = $stmt->fetch();
        }
    } else if ($method === 'DELETE') {
        if (empty($id)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "ID is required for delete"];
        } else {
            $stmt = $pdo->prepare("DELETE FROM education_resources WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $res_body = ["success" => true];
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
