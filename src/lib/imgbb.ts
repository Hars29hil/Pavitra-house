
const IMGBB_API_KEY = 'ae5b3131d7716b62c274cbadb4e8c95a';

interface ImgBBResponse {
    success: boolean;
    data: {
        url: string;
        // other fields omitted
    };
}

export const uploadToImgBB = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    // ImgBB API endpoint
    const url = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            body: formData,
        });

        const result: ImgBBResponse = await response.json();

        if (result.success) {
            return result.data.url;
        } else {
            console.error("ImgBB Upload Error:", result);
            throw new Error("Failed to upload image to ImgBB");
        }
    } catch (error) {
        console.error("ImgBB Network Error:", error);
        throw error;
    }
};
