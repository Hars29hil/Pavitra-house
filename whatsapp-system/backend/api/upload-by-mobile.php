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
            $mobileInput = $_POST['mobile'] ?? $_GET['mobile'] ?? '';
            
            if (empty($mobileInput)) {
                $status_code = 400;
                $res_body = ["success" => false, "error" => "Mobile number is required"];
            } else if ($file['error'] !== UPLOAD_ERR_OK) {
                $status_code = 400;
                $res_body = ["success" => false, "error" => "Upload failed with error code: " . $file['error']];
            } else {
                // Validate mime type
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mime = finfo_file($finfo, $file['tmp_name']);
                finfo_close($finfo);
                
                if (strpos($mime, 'image/') !== 0) {
                    $status_code = 400;
                    $res_body = ["success" => false, "error" => "Only image files are allowed!"];
                } else {
                    // Fetch students to match mobile
                    $stmt = $pdo->query("SELECT id, name, mobile FROM students");
                    $students = $stmt->fetchAll();
                    
                    if (empty($students)) {
                        $status_code = 404;
                        $res_body = ["success" => false, "error" => "No students found in the database"];
                    } else {
                        // Standardize input number
                        $cleanInput = preg_replace('/\D/', '', (string)$mobileInput);
                        
                        $matchedStudent = null;
                        if (!empty($cleanInput)) {
                            foreach ($students as $student) {
                                if (empty($student['mobile'])) continue;
                                $cleanDb = preg_replace('/\D/', '', (string)$student['mobile']);
                                if (strlen($cleanDb) < 10 || strlen($cleanInput) < 10) continue;
                                if (substr($cleanDb, -10) === substr($cleanInput, -10)) {
                                    $matchedStudent = $student;
                                    break;
                                }
                            }
                        }
                        
                        if (!$matchedStudent) {
                            $status_code = 404;
                            $res_body = [
                                "success" => false,
                                "error" => "No student found matching mobile number: " . $mobileInput
                            ];
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
                                
                                // Update student record in database
                                $updateStmt = $pdo->prepare("UPDATE students SET profile_image = :profile_image WHERE id = :id");
                                $updateStmt->execute([
                                    'profile_image' => $fileUrl,
                                    'id' => $matchedStudent['id']
                                ]);
                                
                                $res_body = [
                                    "success" => true,
                                    "message" => "Profile photo uploaded and matched successfully",
                                    "url" => $fileUrl,
                                    "student" => [
                                        "id" => $matchedStudent['id'],
                                        "name" => $matchedStudent['name'],
                                        "mobile" => $matchedStudent['mobile']
                                    ]
                                ];
                            } else {
                                $status_code = 500;
                                $res_body = ["success" => false, "error" => "Failed to move uploaded file"];
                            }
                        }
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
    array_merge($_POST, $_FILES), 
    $res_body
);
