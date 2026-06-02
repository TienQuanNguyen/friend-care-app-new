import { GoogleGenerativeAI } from '@google/generative-ai';

function buildPersonalRecentSummary(personalRecentEntries: any[]): string {
  if (!personalRecentEntries || !Array.isArray(personalRecentEntries) || personalRecentEntries.length === 0) {
    return 'Không có lịch sử cá nhân gần đây.';
  }

  const summaries = personalRecentEntries.map((e: any) => {
    const dateStr = e.entry_date || e.created_at || '?';
    const moodStr = e.mood || '?';
    const energyVal = e.energy ?? e.energy_level ?? '?';
    const noteStr = (e.note || '').trim().slice(0, 150) || 'Không chia sẻ';
    const gratitudeStr = (e.gratitude || '').trim().slice(0, 100) || 'Không';
    return `- Ngày ${dateStr}: Tâm trạng "${moodStr}", Năng lượng ${energyVal}/10. Ghi chú: "${noteStr}". Biết ơn: "${gratitudeStr}".`;
  });

  return summaries.join('\n');
}

function buildSharedRecentSummary(sharedRecentEntries: any[]): string {
  if (!sharedRecentEntries || !Array.isArray(sharedRecentEntries) || sharedRecentEntries.length === 0) {
    return 'Không có lịch sử của các thành viên khác gần đây.';
  }

  const summaries = sharedRecentEntries.map((e: any) => {
    const creator = e.creator_name || 'Thành viên khác';
    const dateStr = e.entry_date || e.created_at || '?';
    const moodStr = e.mood || '?';
    const energyVal = e.energy ?? e.energy_level ?? '?';
    const noteStr = (e.note || '').trim().slice(0, 100) || 'Không chia sẻ';
    return `- Ngày ${dateStr}, ${creator}: Tâm trạng "${moodStr}", Năng lượng ${energyVal}/10. Nhật ký viết: "${noteStr}".`;
  });

  return summaries.join('\n');
}

function buildSharedConcernContext(personalRecentEntries: any[], sharedRecentEntries: any[]): string {
  if (!personalRecentEntries || !sharedRecentEntries) {
    return 'Không có mối quan tâm chung rõ ràng.';
  }

  const keywords = [
    'tháng 7', 'thang 7', 'việt nam', 'viet nam', 'gặp lại', 'gap lai',
    'im lặng', 'im lang', 'mở lời', 'mo loi', 'gia đình', 'gia dinh',
    'năm cuối', 'nam cuoi', 'hồ sơ', 'ho so', 'tương lai', 'tuong lai',
    'học tập', 'hoc tap', 'công việc', 'cong viec', 'mưa', 'sài gòn', 'sai gon',
    'cafe', 'món ăn', 'mon an', 'bài nhạc', 'bai nhac', 'kỷ niệm', 'ky niem',
    'chia tay', 'người ấy', 'nguoi ay', 'seen', 'xa cách', 'xa cach'
  ];

  const extractKeywords = (entries: any[]) => {
    const found = new Set<string>();
    entries.forEach(e => {
      const text = `${e.note || ''} ${e.gratitude || ''}`.toLowerCase();
      keywords.forEach(kw => {
        if (text.includes(kw)) {
          found.add(kw);
        }
      });
    });
    return Array.from(found);
  };

  const personalTopics = extractKeywords(personalRecentEntries);
  const sharedTopics = extractKeywords(sharedRecentEntries);

  const normalize = (topic: string) => {
    return topic
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase()
      .trim();
  };

  const overlapNormalized = personalTopics.map(normalize).filter(t => 
    sharedTopics.map(normalize).includes(t)
  );

  const overlapTopics = personalTopics.filter(t => 
    overlapNormalized.includes(normalize(t))
  );

  if (overlapTopics.length > 0) {
    const topicsStr = overlapTopics.map(t => `"${t}"`).join(', ');
    return `Trong không gian chung gần đây, cả hai đều nhắc đến chủ đề liên quan đến ${topicsStr}. Đây là mối quan tâm chung, nhưng không đồng nghĩa cảm xúc của hai người giống nhau.`;
  }

  return 'Không có mối quan tâm chung rõ ràng.';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const {
    mood,
    energy_level,
    note,
    gratitude,
    currentUser,
    personalRecentEntries,
    sharedRecentEntries,
    recentEntries,
    variationSeed
  } = req.body || {};

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

  const currentUserId = currentUser?.id || 'unknown';
  const currentUserName = currentUser?.display_name || 'Người dùng';

  let personalList = personalRecentEntries || [];
  if (!personalList || (Array.isArray(personalList) && personalList.length === 0)) {
    if (recentEntries && Array.isArray(recentEntries) && recentEntries.length > 0) {
      personalList = recentEntries.map((e: any) => ({
        entry_date: e.date || e.entry_date,
        mood: e.mood,
        energy_level: e.energy ?? e.energy_level,
        note: e.note,
        gratitude: e.gratitude
      }));
    }
  }

  const personalRecentSummary = buildPersonalRecentSummary(personalList);
  const sharedRecentSummary = buildSharedRecentSummary(sharedRecentEntries || []);
  const sharedConcernSummary = buildSharedConcernContext(personalList, sharedRecentEntries || []);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Bạn đang viết lời khuyên cảm xúc cho người dùng hiện tại.

Người dùng hiện tại:
- id: ${currentUserId}
- tên hiển thị: ${currentUserName}

Dữ liệu hôm nay của người dùng hiện tại:
- mood: ${mood}
- energy: ${safeEnergy}/10
- câu chuyện hôm nay: "${noteText}"
- điều biết ơn hôm nay: "${gratitudeText}"

Lịch sử cá nhân gần đây của chính người dùng hiện tại:
${personalRecentSummary}

Ngữ cảnh chung từ các thành viên khác:
${sharedRecentSummary}

Mối quan tâm chung nếu có:
${sharedConcernSummary}

Variation seed: ${variationSeed || 'none'}

Luật cực kỳ quan trọng:
1. Chỉ xem “Dữ liệu hôm nay” và “Lịch sử cá nhân gần đây” là câu chuyện của người dùng hiện tại.
2. “Ngữ cảnh chung từ các thành viên khác” chỉ là bối cảnh phụ.
3. Không được nói vấn đề của thành viên khác như thể đó là vấn đề của người dùng hiện tại.
4. Nếu nhắc đến dữ liệu của thành viên khác, đó là quan tâm và đang nhắc đến vấn đề của người còn lại.
5. Chỉ viết “dạo này bạn hay...” nếu điều đó xuất hiện trong personalRecentEntries.
6. Câu chuyện hôm nay của người dùng hiện tại là trung tâm tuyệt đối.
7. Mood và energy chỉ là ngữ cảnh phụ, KHÔNG được dùng làm nội dung chính.
8. Không viết theo template.
9. Không dùng markdown/bullet, không đánh số.
10. Bắt đầu ngay vào nội dung, tuyệt đối không chào hỏi kiểu "Chào bạn".
11. Viết 7–12 câu. Chỉ viết 13–14 câu nếu câu chuyện dài và có nhiều chi tiết đáng phản hồi. Không kéo dài bằng câu lặp ý.
12. Có 1–2 gợi ý nhỏ, thực tế.
13. Giọng văn tự nhiên, cụ thể, giống một người bạn thân đang phản hồi. Xưng "tôi", gọi "bạn".
14. Không chẩn đoán tâm lý/y khoa.
15. Không nhắc mình là AI/trợ lý ảo.
16. Nếu câu chuyện quá ngắn hoặc mơ hồ, không được bịa thêm chi tiết. Hãy phản hồi dựa trên phần có thật, rồi đặt một câu mở nhẹ nhàng để người dùng tự nhìn lại.
17. Luật sử dụng mối quan tâm chung:
   - Nếu sharedConcernSummary có nội dung (không phải "Không có mối quan tâm chung rõ ràng."), có thể nhắc tối đa 1–2 câu.
   - Chỉ nhắc nếu nó giúp lời khuyên cho current user cụ thể và tinh tế hơn.
   - Không biến shared concern thành kết luận chắc chắn.
   - Dùng cách nói mềm:
     - “Có vẻ chủ đề này cũng đang xuất hiện trong không gian chung gần đây...”
     - “Tôi thấy đây không hẳn là chuyện riêng lẻ của bạn, nhưng cách bạn trải qua nó vẫn là điều cần được lắng nghe trước.”
   - Không dùng cách nói áp đặt:
     - “Cả hai đều đang...”
     - “Hai bạn chắc chắn...”
     - “Người kia cũng cảm thấy giống bạn...”

Hãy viết đoạn phản hồi cảm xúc bằng tiếng Việt ngay dưới đây:`;

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
