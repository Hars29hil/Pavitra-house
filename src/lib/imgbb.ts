import api from './api';

interface UploadResponse {
    success: boolean;
    url: string;
    filename: string;
}

export const uploadToImgBB = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await api.post<UploadResponse>("/api/upload", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        if (response.data && response.data.success) {
            return response.data.url;
        } else {
            console.error("Backend Upload Error:", response.data);
            throw new Error("Failed to upload image to backend");
        }
    } catch (error) {
        console.error("Backend Upload Network Error:", error);
        throw error;
    }
};
