import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const uploadFileToSupabase = async (fileBuffer, mimeType, bucket, fileName) => {
    try {
        const url = `${process.env.STORAGE_URL}/${bucket}/${fileName}`;
        
        await axios.post(url, fileBuffer, {
            headers: {
                'Authorization': `Bearer ${process.env.STORAGE_KEY}`,
                'Content-Type': mimeType
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        // Construct public URL (adjust based on your Supabase settings)
        return `${process.env.STORAGE_URL.replace('/object', '/object/public')}/${bucket}/${fileName}`;
    } catch (error) {
        console.error("Storage Upload Error:", error.response?.data || error.message);
        throw new Error("File upload failed");
    }
};