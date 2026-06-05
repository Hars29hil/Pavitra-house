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
            $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $category = $stmt->fetch();
            if ($category) {
                $category['student_ids'] = json_decode($category['student_ids'] ?: '[]', true);
                $res_body = $category;
            } else {
                $status_code = 404;
                $res_body = ["success" => false, "error" => "Category not found"];
            }
        } else {
            $stmt = $pdo->query("SELECT * FROM categories ORDER BY created_at ASC");
            $categories = $stmt->fetchAll();
            foreach ($categories as &$cat) {
                $cat['student_ids'] = json_decode($cat['student_ids'] ?: '[]', true);
            }
            $res_body = $categories;
        }
    } else if ($method === 'POST') {
        $new_id = generate_uuid();
        
        $name = $req_body['name'] ?? '';
        $type = $req_body['type'] ?? '';
        $parent_id = $req_body['parent_id'] ?? $req_body['parentId'] ?? null;
        $student_ids = $req_body['student_ids'] ?? $req_body['studentIds'] ?? [];
        
        if (empty($name) || empty($type)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "name and type are required"];
        } else {
            $sql = "INSERT INTO categories (id, name, type, parent_id, student_ids) 
                    VALUES (:id, :name, :type, :parent_id, :student_ids)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'id' => $new_id,
                'name' => $name,
                'type' => $type,
                'parent_id' => $parent_id,
                'student_ids' => json_encode($student_ids)
            ]);
            
            // Fetch and return the inserted row
            $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = :id");
            $stmt->execute(['id' => $new_id]);
            $category = $stmt->fetch();
            $category['student_ids'] = json_decode($category['student_ids'] ?: '[]', true);
            $res_body = $category;
        }
    } else if ($method === 'PUT') {
        if (empty($id)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "ID is required for update"];
        } else {
            // Check if category exists
            $stmt = $pdo->prepare("SELECT id FROM categories WHERE id = :id");
            $stmt->execute(['id' => $id]);
            if (!$stmt->fetch()) {
                $status_code = 404;
                $res_body = ["success" => false, "error" => "Category not found"];
            } else {
                $fields = [];
                $params = ['id' => $id];
                
                $fieldMapping = [
                    'name' => 'name',
                    'type' => 'type',
                    'parent_id' => 'parent_id',
                    'parentId' => 'parent_id',
                    'student_ids' => 'student_ids',
                    'studentIds' => 'student_ids'
                ];
                
                foreach ($req_body as $key => $val) {
                    if (isset($fieldMapping[$key])) {
                        $dbKey = $fieldMapping[$key];
                        $fields[] = "$dbKey = :$dbKey";
                        if ($dbKey === 'student_ids') {
                            $params[$dbKey] = json_encode($val ?: []);
                        } else {
                            $params[$dbKey] = $val;
                        }
                    }
                }
                
                if (empty($fields)) {
                    $status_code = 400;
                    $res_body = ["success" => false, "error" => "No fields to update"];
                } else {
                    $sql = "UPDATE categories SET " . implode(", ", $fields) . " WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    
                    // Fetch and return the updated row
                    $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = :id");
                    $stmt->execute(['id' => $id]);
                    $category = $stmt->fetch();
                    $category['student_ids'] = json_decode($category['student_ids'] ?: '[]', true);
                    $res_body = $category;
                }
            }
        }
    } else if ($method === 'DELETE') {
        if (empty($id)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "ID is required for delete"];
        } else {
            $stmt = $pdo->prepare("DELETE FROM categories WHERE id = :id");
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
