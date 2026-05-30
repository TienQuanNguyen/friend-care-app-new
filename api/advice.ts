import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { type, mood, energy_level, note, gratitude, recentEntries } = req.body || {};

  if (!mood) {
    return res.status(400).json({ error: 'Missing required field: mood' });
  }

  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Backend API Error] Gemini API Key is not defined.');
    return res.status(500).json({ error: 'Config error' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let historyContext = '';
    if (recentEntries && Array.isArray(recentEntries) && recentEntries.length > 0) {
      historyContext = `\nLịch sử cảm xúc gần đây của họ (để bạn hiểu thêm ngữ cảnh và có thể cá nhân hóa lời khuyên, không cần nhắc lại chi tiết lịch sử này trừ khi thấy sự liên kết với hôm nay):\n` +
        recentEntries.map(e => `- Ngày ${e.date}: Tâm trạng "${e.mood}", Năng lượng ${e.energy}/10. Chuyện xảy ra: "${e.note || 'Không'}", Biết ơn: "${e.gratitude || 'Không'}"`).join('\n') + `\n`;
    }

    const prompt = `
Bạn là một người bạn tri kỷ, một chuyên gia tâm lý vô cùng tinh tế, ấm áp và thấu cảm.
Người dùng vừa ghi lại nhật ký cảm xúc hôm nay với các thông tin sau:
- Tâm trạng hôm nay: ${mood}
- Mức năng lượng cơ thể: ${energy_level}/10 (1 là cạn kiệt, 10 là tràn đầy)
- ĐIỀU KHIẾN HỌ THẤY VẬY (Câu chuyện hôm nay): "${note || 'Không chia sẻ gì thêm'}"
- LƯU GIỮ SỰ BIẾT ƠN (Điều biết ơn hôm nay): "${gratitude || 'Không chia sẻ gì thêm'}"
${historyContext}
Hãy viết một đoạn phản hồi ngắn (từ 7 đến 12 câu) dành riêng cho người dùng.
YÊU CẦU BẮT BUỘC (PHẢI TUÂN THỦ NGHIÊM NGẶT):
1. Tuyệt đối KHÔNG chào hỏi kiểu "Chào bạn", KHÔNG tự xưng là "AI" hay "trợ lý ảo". Bắt đầu ngay vào nội dung. Xưng "tôi" và gọi là "bạn" (hoặc dùng đúng xưng hô họ dùng trong câu chuyện nếu có).
2. TẬP TRUNG TỐI ĐA VÀO CÂU CHUYỆN "ĐIỀU KHIẾN HỌ THẤY VẬY" VÀ "LƯU GIỮ SỰ BIẾT ƠN". Phải phân tích sâu vào nội dung cụ thể mà họ đã viết để đưa ra lời khuyên cá nhân hóa, sát với tình huống thực tế của họ. KHÔNG được chỉ trả lời rập khuôn chung chung dựa vào "Tâm trạng" hay "Năng lượng".
3. Nếu họ kể chuyện buồn/áp lực: Lắng nghe sâu sắc, xác nhận cảm xúc của họ là hoàn toàn hợp lý, đưa ra lời an ủi, thấu cảm chân thành. Nếu năng lượng thấp, khuyên họ nghỉ ngơi.
4. Nếu họ kể chuyện vui/tích cực: Cùng chung vui, khích lệ họ giữ gìn nguồn năng lượng này.
5. Móc nối khéo léo phần "Lưu giữ sự biết ơn" vào lời khuyên để tạo động lực và khen ngợi sự nhìn nhận tích cực của họ về cuộc sống.
6. Tham khảo "Lịch sử cảm xúc" để xem dạo gần đây họ đang mệt mỏi kéo dài hay đang tốt lên, từ đó đưa ra lời động viên kết nối được quá khứ và hiện tại (VD: "Mấy hôm trước bạn khá mệt, thật vui vì hôm nay đã ổn hơn..." hoặc "Dạo này bạn có vẻ áp lực kéo dài...").
7. Giọng văn phải CỰC KỲ tự nhiên, sâu lắng, chân thật, giống như lời một người bạn thân đang ngồi cạnh rót một cốc nước ấm và trò chuyện cùng họ.
`;

    const result = await model.generateContent(prompt);
    const adviceText = result.response.text().trim();
    
    return res.status(200).json({ advice: adviceText });
  } catch (error: any) {
    console.error('[Backend API Error] Gemini call failed:', error.message || error);
    return res.status(502).json({ error: 'Gemini service unavailable' });
  }
}
