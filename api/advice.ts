import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { mood, energy_level, note, gratitude, recentEntries, variationSeed } = req.body || {};

  if (!mood) {
    return res.status(400).json({ error: 'Missing required field: mood' });
  }

  // Only use server-side env var. In Vite dev mode, ssrLoadModule exposes
  // import.meta.env for .env.local values prefixed with VITE_.
  const apiKey = process.env.GEMINI_API_KEY
    || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY)
    || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[Backend API Error] GEMINI_API_KEY is not defined.');
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const safeEnergy = (typeof energy_level === 'number' && energy_level >= 1 && energy_level <= 10)
    ? energy_level : 5;
  const noteText = (note || '').trim().slice(0, 800) || 'Không chia sẻ gì thêm';
  const gratitudeText = (gratitude || '').trim().slice(0, 500) || 'Không chia sẻ gì thêm';

  // Build recent entries summary
  let recentEntriesSummary = 'Không có lịch sử gần đây.';
  if (recentEntries && Array.isArray(recentEntries) && recentEntries.length > 0) {
    recentEntriesSummary = recentEntries.slice(0, 14).map((e: any) => {
      const entryNote = (e.note || '').trim().slice(0, 200) || 'Không';
      const entryGratitude = (e.gratitude || '').trim().slice(0, 150) || 'Không';
      const entryEnergy = e.energy ?? e.energy_level ?? '?';
      return `- Ngày ${e.date || e.entry_date || '?'}: Tâm trạng "${e.mood || '?'}", Năng lượng ${entryEnergy}/10. Chuyện: "${entryNote}", Biết ơn: "${entryGratitude}"`;
    }).join('\n');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Bạn đang viết một đoạn phản hồi cảm xúc bằng tiếng Việt cho nhật ký riêng tư của người dùng.
Cách phản hồi:
Hãy viết như một người bạn thân đang đọc nhật ký riêng tư của người dùng. Mục tiêu không phải là đưa ra một lời khuyên đẹp, mà là khiến người dùng cảm thấy câu chuyện của họ thật sự được đọc và được hiểu.
Mục tiêu: Không viết theo template. Không viết lời khuyên chung chung theo mood. Không viết kiểu thơ/sến. Hãy đọc câu chuyện người dùng kể, hiểu cảm xúc bên trong, rồi phản hồi như một người bạn thật sự đang lắng nghe.

Dữ liệu hôm nay:
- Tâm trạng: ${mood}
- Năng lượng: ${safeEnergy}/10
- Câu chuyện hôm nay: "${noteText}"
- Điều biết ơn hôm nay: "${gratitudeText}"

Ngữ cảnh gần đây:
${recentEntriesSummary}

Variation seed: ${variationSeed || 'none'}

Luật viết:
1. Câu chuyện trong "Câu chuyện hôm nay" là trung tâm tuyệt đối.
2. "Điều biết ơn hôm nay" là điểm tựa phụ, nối vào tự nhiên.
3. Mood và energy chỉ là ngữ cảnh phụ, KHÔNG được dùng làm nội dung chính.
4. Nếu "Câu chuyện hôm nay" có nội dung, 2 câu đầu phải đi thẳng vào câu chuyện đó.
5. Nếu câu chuyện buồn nhưng mood là "Bình yên", hãy hiểu "bình yên" như một khoảng lặng sau nhiều ngày suy nghĩ, không phải vui vẻ.
6. Nếu câu chuyện nhắc đến mưa, Sài Gòn, năm cuối, hồ sơ, gia đình, bạn bè, áp lực, tương lai, seen, người ấy, chia tay... phải phản hồi đúng các chi tiết đó.
7. Nếu "Ngữ cảnh gần đây" cho thấy chủ đề lặp lại nhiều ngày, chỉ nhắc nhẹ 1 câu.
8. Cấm tuyệt đối các cụm: "mọi việc rồi sẽ ổn" (nếu không có ngữ cảnh), "trân trọng hành trình", "ngọn đèn nhỏ", "món quà vô giá", "khi bạn chia sẻ rằng", "sự kiện này tác động trực tiếp", "lý giải vì sao", "giữa cuộc sống hối hả", "soi sáng và sưởi ấm tâm hồn".
9. Không chẩn đoán tâm lý/y khoa.
10. Không nhắc mình là AI/trợ lý ảo.
11. Không markdown, không bullet, không đánh số.
12.Viết 7–12 câu. Chỉ viết 13–14 câu nếu câu chuyện dài và có nhiều chi tiết đáng phản hồi. Không kéo dài bằng câu lặp ý.
13. Có 1–2 gợi ý nhỏ, thực tế.
14. Giọng văn tự nhiên, cụ thể, giống một người bạn thân đang phản hồi. Xưng "tôi", gọi "bạn".
15. Tuyệt đối KHÔNG chào hỏi kiểu "Chào bạn". Bắt đầu ngay vào nội dung.
16. Nếu câu chuyện quá ngắn hoặc mơ hồ, không được bịa thêm chi tiết. Hãy phản hồi dựa trên phần có thật, rồi đặt một câu mở nhẹ nhàng để người dùng tự nhìn lại.
Hãy viết đoạn phản hồi ngay dưới đây:`;

    const result = await model.generateContent(prompt);
    const adviceText = result.response.text().trim();

    if (!adviceText) {
      console.error('[Backend API Error] Gemini returned empty response.');
      return res.status(502).json({ error: 'Gemini returned empty advice' });
    }

    return res.status(200).json({ advice: adviceText });
  } catch (error: any) {
    console.error('[Backend API Error] Gemini call failed:', error.message || error);
    const statusCode = error.status || 502;
    return res.status(statusCode).json({ error: 'Gemini service unavailable' });
  }
}
