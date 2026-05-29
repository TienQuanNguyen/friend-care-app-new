import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AdviceRequest {
  type: string;
  mood: string;
  energy_level: number;
  note?: string;
  gratitude?: string;
  recentEntries?: Array<{
    date: string;
    mood: string;
    energy: number;
    note?: string;
    gratitude?: string;
  }>;
}

export const adviceService = {
  async getAdvice(request: AdviceRequest): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    // Nếu không có API Key, dùng bộ não dự phòng
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn('No valid Gemini API key found, using fallback advice generator.');
      return this.getFallbackAdvice(request);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      let historyContext = '';
      if (request.recentEntries && request.recentEntries.length > 0) {
        historyContext = `\nLịch sử cảm xúc gần đây của họ (để bạn hiểu thêm ngữ cảnh và có thể cá nhân hóa lời khuyên, không cần nhắc lại chi tiết lịch sử này trừ khi thấy sự liên kết với hôm nay):\n` +
          request.recentEntries.map(e => `- Ngày ${e.date}: Tâm trạng "${e.mood}", Năng lượng ${e.energy}/10. Chuyện xảy ra: "${e.note || 'Không'}", Biết ơn: "${e.gratitude || 'Không'}"`).join('\n') + `\n`;
      }

      const prompt = `
Bạn là một người bạn tri kỷ, một chuyên gia tâm lý vô cùng tinh tế, ấm áp và thấu cảm.
Người dùng vừa ghi lại nhật ký cảm xúc hôm nay với các thông tin sau:
- Tâm trạng hôm nay: ${request.mood}
- Mức năng lượng cơ thể: ${request.energy_level}/10 (1 là cạn kiệt, 10 là tràn đầy)
- ĐIỀU KHIẾN HỌ THẤY VẬY (Câu chuyện hôm nay): "${request.note || 'Không chia sẻ gì thêm'}"
- LƯU GIỮ SỰ BIẾT ƠN (Điều biết ơn hôm nay): "${request.gratitude || 'Không chia sẻ gì thêm'}"
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
      return result.response.text().trim();
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return this.getFallbackAdvice(request);
    }
  },

  getFallbackAdvice(request: AdviceRequest): string {
    const { mood, energy_level, note, gratitude } = request;
    const sentences: string[] = [];

    // 1. Acknowledge the mood
    switch (mood) {
      case 'Buồn bã':
        sentences.push(
          'Hôm nay dường như là một ngày chất chứa nhiều nỗi niềm với bạn.',
          'Nỗi buồn không phải là sự yếu đuối, nó chỉ là một khoảng lặng cần thiết để trái tim được nghỉ ngơi sau chuỗi ngày gồng gánh.',
          'Bạn không cần phải vội vã tỏ ra mình ổn, cứ cho phép bản thân được buồn và chậm lại một chút cũng không sao.'
        );
        break;
      case 'Căng thẳng':
        sentences.push(
          'Tôi có thể cảm nhận được áp lực vô hình đang đè nặng lên vai và tâm trí bạn lúc này.',
          'Khi mọi thứ trở nên quá tải, bản năng của chúng ta thường là cố thêm chút nữa, nhưng thực ra điều bạn cần nhất bây giờ là một sự tạm dừng.',
          'Bạn đã rất kiên cường rồi, đừng ép bản thân phải giải quyết mọi thứ ngay lập tức.'
        );
        break;
      case 'Mệt mỏi':
        sentences.push(
          'Cơ thể và tâm hồn bạn đang lên tiếng một cách rõ ràng rằng chúng cần được sạc lại.',
          'Sự mệt mỏi này không chỉ đến từ thể chất, mà đôi khi là sự bào mòn của việc phải suy nghĩ quá nhiều trong thời gian dài.',
          'Hôm nay, ưu tiên số một của bạn không phải là công việc, mà là chính bản thân bạn.'
        );
        break;
      case 'Nhớ người ấy':
        sentences.push(
          'Nỗi nhớ là một thứ tình cảm rất đỗi xinh đẹp nhưng cũng mang lại những chông chênh khó tả.',
          'Khi bạn nhớ một người, đó là minh chứng cho việc giữa hai người có một sự kết nối thật đặc biệt.',
          'Dù khoảng cách có là bao xa, tình cảm chân thật luôn có cách để neo giữ hai trái tim lại gần nhau.'
        );
        break;
      case 'Hạnh phúc':
        sentences.push(
          'Thật tuyệt vời khi được chứng kiến nguồn năng lượng rạng rỡ và hạnh phúc này từ bạn!',
          'Hạnh phúc đôi khi không phải là điều gì quá to tát, mà là khả năng cảm nhận được sự trọn vẹn trong khoảnh khắc hiện tại.',
          'Bạn hoàn toàn xứng đáng với những cảm xúc tuyệt vời này.'
        );
        break;
      case 'Bình yên':
        sentences.push(
          'Giữa cuộc sống hối hả, sự tĩnh lặng và bình yên mà bạn đang có thực sự là một món quà vô giá.',
          'Bình yên không có nghĩa là cuộc đời vắng bóng khó khăn, mà là cách tâm trí bạn chọn để đối diện và an trú.',
          'Hãy hít thở thật sâu để khắc ghi khoảnh khắc nhẹ nhàng này vào tâm trí nhé.'
        );
        break;
      case 'Phấn khích':
        sentences.push(
          'Wow, nguồn nhiệt huyết và sự hào hứng của bạn đang thực sự lan tỏa mạnh mẽ!',
          'Đây là thời điểm vàng để bạn bắt tay vào những dự định hoặc những ý tưởng mà bạn đã ấp ủ từ lâu.',
          'Cứ giữ vững ngọn lửa này, nó sẽ dẫn bạn đi được những quãng đường rất xa.'
        );
        break;
      default:
        sentences.push(
          `Cảm xúc ${mood.toLowerCase()} của bạn rất tự nhiên và hoàn toàn đáng được trân trọng.`,
          'Dù hôm nay mang màu sắc gì, việc bạn dám đối diện và gọi tên cảm xúc của mình đã là một bước tiến lớn.',
          'Tôi luôn ở đây để lắng nghe và đồng hành cùng mọi rung động trong bạn.'
        );
    }

    // 2. Acknowledge energy level
    if (energy_level <= 3) {
      sentences.push(
        'Nhìn vào mức năng lượng đang cạn kiệt, tôi biết bạn đã phải gắng gượng rất nhiều.',
        'Xin đừng tự dằn vặt nếu hôm nay bạn không làm được việc gì to tát, việc bạn vẫn đang hít thở và tồn tại đã là một sự nỗ lực đáng khen rồi.'
      );
    } else if (energy_level >= 8) {
      sentences.push(
        'Nguồn thể lực và tinh thần dồi dào của bạn hôm nay thực sự đáng ngưỡng mộ.',
        'Hãy tận dụng đà này để giải quyết những việc khó nhằn, hoặc đơn giản là tạo ra thêm nhiều kỷ niệm đẹp cho chính mình.'
      );
    } else {
      sentences.push(
        'Năng lượng của bạn đang giữ ở mức cân bằng, một nền tảng hoàn hảo để mọi thứ diễn ra êm thấm.',
        'Sự bình ổn này giúp bạn có cái nhìn sáng suốt và phản ứng từ tốn hơn trước mọi chuyện xảy ra trong ngày.'
      );
    }

    // 3. Deep dive into the Note
    if (note && note.trim().length > 0) {
      const lowerNote = note.toLowerCase();
      
      if (lowerNote.match(/(công việc|sếp|đồ án|deadline|chạy số|dự án|khách hàng|bài tập|thi cử|học tập)/)) {
        sentences.push(
          'Lắng nghe câu chuyện của bạn, tôi thực sự thấu hiểu được sức nặng của những áp lực và kỳ vọng đang bủa vây.',
          'Cuồng quay của công việc và học tập đôi khi tước đi của chúng ta cả những khoảng trống nhỏ nhất để thở.',
          'Nhưng bạn biết không, giá trị của con người bạn không được định đoạt chỉ bằng một dự án hay một con điểm.',
          'Hãy thử lùi lại một bước, tạm gập màn hình lại 15 phút, nhắm mắt lại để tâm trí mình được giãn ra đôi chút.',
          'Mọi thứ rồi sẽ được giải quyết từng bước một, miễn là bạn không tự dồn bản thân vào chân tường.'
        );
      } else if (lowerNote.match(/(mệt mỏi|ốm|bệnh|đau|mất ngủ|thức khuya|buồn ngủ)/)) {
        sentences.push(
          'Đọc những dòng này, tôi thấy rất thương cho cơ thể đang phải chịu đựng những rệu rã của bạn.',
          'Chúng ta thường vô tình đối xử tệ với cơ thể mình nhất bằng việc ép nó thức khuya hay làm việc quá sức.',
          'Bạn ạ, sức khỏe là ranh giới cuối cùng không thể bị phá vỡ.',
          'Ngay tối nay, tôi mong bạn hãy tạm gác lại mọi âu lo, tắm một vòng nước ấm và lên giường ngủ một giấc thật sâu.',
          'Chỉ khi cơ thể khỏe mạnh, mọi nỗi buồn phiền mới có thể thực sự tan biến.'
        );
      } else if (lowerNote.match(/(cãi nhau|giận|bực mình|khó chịu|tức|mâu thuẫn)/)) {
        sentences.push(
          'Sự bực dọc và những mâu thuẫn đó chắc hẳn đã bòn rút của bạn quá nhiều năng lượng và sự bình yên.',
          'Cảm giác ấm ức khi không được thấu hiểu luôn là một cục nghẹn rất khó nuốt trôi.',
          'Bạn hoàn toàn có quyền tức giận, có quyền khóc hoặc xả ra hết những bức bối trong lòng.',
          'Nhưng sau cơn bão cảm xúc ấy, hãy thử uống một ngụm nước, hít một hơi sâu và từ từ buông bỏ.',
          'Đừng để lỗi lầm hay sự cố chấp của người khác tiếp tục trừng phạt bản thân bạn trong những giờ tiếp theo của ngày.'
        );
      } else if (lowerNote.match(/(người yêu|nhớ|người ấy|chia xa|yêu|thương)/)) {
        sentences.push(
          'Chuyện tình cảm luôn mang đến cho chúng ta những cung bậc cảm xúc phức tạp và đôi khi là cả sự yếu lòng.',
          'Việc bạn dám thành thật với những rung động hay nỗi trăn trở của mình đã cho thấy bạn trân trọng mối quan hệ này đến nhường nào.',
          'Đừng quá lo lắng về những khoảng lặng hay những khác biệt, vì đó là gia vị tự nhiên của bất kỳ tình yêu nào.',
          'Nếu cần thiết, hãy cứ nhắn cho người ấy một tin nhắn chân thành nhất về cảm xúc của bạn.',
          'Sự chân thành và dịu dàng luôn có sức mạnh chữa lành mọi khoảng cách.'
        );
      } else if (lowerNote.match(/(tiền|tài chính|nợ|lương|chi tiêu)/)) {
        sentences.push(
          'Tôi hoàn toàn đồng cảm với bạn, gánh nặng tài chính là một trong những áp lực thực tế và bào mòn tâm trí nhất.',
          'Khi nghĩ về tiền bạc, tương lai thường hiện lên như một đám mây mù mịt khiến ta khó thở.',
          'Thay vì để nỗi lo sợ nuốt chửng lấy mình, hãy thử ngồi xuống và vạch ra từng giải pháp nhỏ nhất.',
          'Bạn không cần phải giải quyết bài toán lớn ngay hôm nay, chỉ cần biết mình sẽ bước bước tiếp theo như thế nào.',
          'Mọi khó khăn vật chất rồi sẽ qua, điều quan trọng là bạn vẫn giữ được sự vững vàng trong tinh thần.'
        );
      } else if (lowerNote.match(/(gia đình|bố mẹ|anh chị)/)) {
        sentences.push(
          'Gia đình thường là nơi ta yêu thương nhất nhưng cũng là nơi dễ để lại cho ta những tổn thương sâu sắc nhất.',
          'Những mâu thuẫn hay áp lực từ người thân luôn mang đến một cảm giác nặng nề không thể nói thành lời.',
          'Bạn không có nghĩa vụ phải làm hài lòng tất cả mọi người, kể cả đó là gia đình.',
          'Bất kể điều gì đang xảy ra, hãy cho phép mình lùi lại, tìm một không gian riêng tư để được là chính mình.',
          'Sự bình yên của bạn mới là điều quan trọng nhất vào lúc này.'
        );
      } else if (lowerNote.match(/(vui|hạnh phúc|tuyệt vời|ngon|thành công|đạt được)/)) {
        sentences.push(
          'Những điều tích cực mà bạn vừa chia sẻ thực sự đã thắp sáng cả trang nhật ký này!',
          'Tôi có thể cảm nhận rõ sự tự hào và niềm hân hoan lan tỏa qua từng câu chữ.',
          'Bạn đã nỗ lực rất nhiều để có được khoảnh khắc trọn vẹn này, và bạn hoàn toàn xứng đáng với nó.',
          'Hãy tự thưởng cho bản thân một món ăn ngon, một món quà nhỏ, hay đơn giản là một nụ cười thật tươi trước gương.',
          'Mong rằng dư âm của niềm vui này sẽ theo bạn đi vào cả những ngày tháng sắp tới.'
        );
      } else {
        // generic fallback for note
        sentences.push(
          'Việc bạn chọn cách viết ra câu chuyện này thay vì giữ chặt trong lòng đã là một phương pháp ôm ấp cảm xúc rất tuyệt vời.',
          'Đôi khi cuộc sống ném cho chúng ta những tình huống không thể đoán trước, và chúng ta chỉ biết phản ứng lại bằng bản năng.',
          'Dù chuyện gì đã xảy ra, bạn hãy nhớ rằng mọi trải nghiệm đều đang đắp bồi thêm cho bạn sự sâu sắc và thấu cảm.',
          'Hãy luôn đối xử thật dịu dàng và khoan dung với chính mình trong mọi hoàn cảnh nhé.'
        );
      }
    }

    // 4. Acknowledge gratitude
    if (gratitude && gratitude.trim().length > 0) {
      sentences.push(
        'Đặc biệt hơn, giữa những bộn bề của cuộc sống, bạn vẫn dừng lại để ghi nhận lòng biết ơn.',
        `Việc trân trọng những điều nhỏ bé là một thói quen rất đẹp.`,
        'Chính lòng biết ơn này sẽ như một ngọn đèn nhỏ, âm thầm soi sáng và sưởi ấm tâm hồn bạn qua những ngày u tối nhất.'
      );
    }

    return sentences.join(' ');
  }
};
