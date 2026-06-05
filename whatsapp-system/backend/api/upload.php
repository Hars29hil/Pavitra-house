<?php
$start_time = round(microtime(true) * 1000);
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$status_code = 200;
$res_body = [];

try {
    if ($method !== 'POST') {
        $status_code = 405;
        $res_body = ["success" => false, "error" => "Method not allowed"];
    } else {
        if (!isset($_FILES['image'])) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "Please upload an image"];
        } else {
            $file = $_FILES['image'];
            
            // Check for upload errors
            if ($file['error'] !== UPLOAD_ERR_OK) {
                $status_code = 400;
                $res_body = ["success" => false, "error" => "Upload failed with error code: " . $file['error']];
            } else {
                // Validate mime type (must start with image/)
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mime = finfo_file($finfo, $file['tmp_name']);
                finfo_close($finfo);
                
                if (strpos($mime, 'image/') !== 0) {
                    $status_code = 400;
                    $res_body = ["success" => false, "error" => "Only image files are allowed!"];
                } else {
                    // Create upload directory if it doesn't exist
                    $upload_dir = dirname(__DIR__) . '/uploads/profile_photos';
                    if (!file_exists($upload_dir)) {
                        mkdir($upload_dir, 0755, true);
                    }
                    
                    // Generate unique filename
                    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
                    if (empty($ext)) {
                        $mime_to_ext = [
                            'image/jpeg' => 'jpg',
                            'image/jpg' => 'jpg',
                            'image/png' => 'png',
                            'image/webp' => 'webp',
                            'image/gif' => 'gif'
                        ];
                        $ext = $mime_to_ext[$mime] ?? 'jpg';
                    }
                    
                    $unique_suffix = time() . "-" . rand(100000000, 999999999);
                    $filename = "profile-" . $unique_suffix . "." . $ext;
                    $destination = $upload_dir . '/' . $filename;
                    
                    if (move_uploaded_file($file['tmp_name'], $destination)) {
                        $fileUrl = get_base_url() . "/api/uploads/profile_photos/" . $filename;
                        
                        $res_body = [
                            "success" => true,
                            "url" => $fileUrl,
                            "filename" => $filename
                        ];
                    } else {
                        $status_code = 500;
                        $res_body = ["success" => false, "error" => "Failed to move uploaded file"];
                    }
                }
            }
        }
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
    $_FILES, 
    $res_body
);
