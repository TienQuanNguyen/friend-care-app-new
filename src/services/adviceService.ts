export interface AdviceRequest {
  type: string;
  mood: string;
  energy_level: number;
  note?: string;
  gratitude?: string;
}

export const adviceService = {
  async getAdvice(request: AdviceRequest): Promise<string> {
    // Simulate a short processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const { mood, energy_level, note, gratitude } = request;

    const energyNote = energy_level <= 3
      ? 'Năng lượng của bạn hôm nay đang rất thấp, điều đó hoàn toàn bình thường và có lý do riêng của nó.'
      : energy_level <= 6
      ? 'Mức năng lượng của bạn đang ở mức vừa phải, không quá cao cũng không quá thấp.'
      : 'Bạn đang có một nguồn năng lượng khá tốt hôm nay, đó là điều tuyệt vời.';

    const noteRef = note
      ? `Bạn chia sẻ rằng: "${note.slice(0, 60)}${note.length > 60 ? '…' : ''}" — điều đó thực sự được lắng nghe và trân trọng.`
      : '';

    const gratitudeRef = gratitude
      ? `Việc bạn nhận ra điều biết ơn — "${gratitude.slice(0, 50)}${gratitude.length > 50 ? '…' : ''}" — là một hành động rất đẹp của tâm hồn.`
      : '';

    switch (mood) {
      case 'Buồn bã':
        return [
          'Hôm nay có vẻ là một ngày nặng nề với bạn, và điều đó hoàn toàn được phép.',
          'Nỗi buồn không phải là dấu hiệu của yếu đuối — nó là bằng chứng rằng bạn đang cảm nhận cuộc sống một cách chân thật.',
          energyNote,
          noteRef,
          'Đôi khi tâm trí chúng ta cần được khóc, cần được nghỉ ngơi, cần được buông lơi một chút.',
          'Hãy thử tìm một góc nhỏ yên tĩnh, một cốc trà ấm, hoặc một bài nhạc nhẹ nhàng mà bạn yêu thích.',
          'Đừng cố gắng che giấu hay vội vã xua đuổi nỗi buồn này — hãy ngồi bên cạnh nó như người bạn cũ.',
          gratitudeRef,
          'Ngay cả trong những ngày u ám nhất, vẫn có những điều nhỏ bé đáng quý xung quanh bạn.',
          'Nếu có thể, hãy nhắn một tin nhắn nhỏ cho người bạn quan tâm — đôi khi chỉ cần biết họ đang ở đây thôi đã đủ.',
          'Bạn không cần phải ổn ngay lập tức. Chỉ cần thở, và biết rằng hôm nay rồi cũng sẽ qua đi.',
        ].filter(Boolean).join(' ');

      case 'Căng thẳng':
        return [
          'Có rất nhiều thứ đang đổ lên vai bạn, và cơ thể cũng như tâm trí bạn đang phải gánh chịu áp lực đó.',
          energyNote,
          noteRef,
          'Khi mọi thứ trở nên quá tải, bản năng của chúng ta thường là cố thêm — nhưng đôi khi điều thông minh nhất là dừng lại.',
          'Hãy thử hít thở sâu ba lần: hít vào đếm bốn, giữ đếm bốn, thở ra đếm sáu. Cơ thể sẽ cảm ơn bạn.',
          'Căng thẳng thường đến từ việc chúng ta cố kiểm soát những thứ không hoàn toàn trong tầm tay.',
          'Hãy viết ra những việc bạn đang lo — rồi gạch ra những thứ ngoài tầm kiểm soát của bạn hôm nay.',
          gratitudeRef,
          'Bạn đã làm rất nhiều rồi. Đừng so sánh tiến độ của mình với người khác — bạn đang đi con đường của riêng mình.',
          'Tối nay, hãy cho phép bản thân được nghỉ ngơi thật sự, dù chỉ 30 phút không nghĩ đến công việc.',
          'Nhớ rằng: bạn không cần phải hoàn hảo để xứng đáng được nghỉ ngơi.',
        ].filter(Boolean).join(' ');

      case 'Mệt mỏi':
        return [
          'Cơ thể và tâm hồn bạn đang lên tiếng — và lần này hãy thực sự lắng nghe chúng.',
          energyNote,
          noteRef,
          'Mệt mỏi không chỉ là thiếu ngủ — đôi khi đó là dấu hiệu của một tâm trí đã phải làm việc quá sức trong thời gian dài.',
          'Hãy tự hỏi: gần đây bạn có thực sự nghỉ ngơi chưa, hay chỉ đang tạm dừng giữa những công việc?',
          'Hãy cố gắng đi ngủ sớm hơn 30 phút tối nay — không có màn hình, không có thông báo.',
          'Nếu có thể, hãy ăn một bữa thật ngon và uống đủ nước hôm nay.',
          gratitudeRef,
          'Đôi khi sự mệt mỏi cũng là dấu hiệu bạn đang trưởng thành và đang làm nhiều điều ý nghĩa hơn.',
          'Hãy cho phép bản thân được làm ít hơn một chút hôm nay, mà không cảm thấy có lỗi.',
          'Bạn xứng đáng được chăm sóc — không phải chỉ sau khi hoàn thành mọi việc, mà ngay bây giờ.',
        ].filter(Boolean).join(' ');

      case 'Nhớ người ấy':
        return [
          'Nỗi nhớ là một trong những cảm xúc đẹp nhất và cũng đau nhất của con người.',
          energyNote,
          noteRef,
          'Khi nhớ ai đó, chúng ta thực ra đang mang họ theo bên cạnh mình — dù khoảng cách có xa đến đâu.',
          'Hãy thử nhắn một tin nhắn nhỏ — một câu đơn giản thôi, không cần phải hoàn hảo.',
          'Hoặc nếu chưa muốn nhắn, hãy viết ra những điều bạn nhớ về họ vào nhật ký hôm nay.',
          gratitudeRef,
          'Tình cảm thật sự không cần phải được nói thành lời mỗi giây — đôi khi chỉ cần nghĩ đến nhau đã là sự kết nối.',
          'Trong khoảng thời gian nhớ nhau này, hãy chăm sóc bản thân thật tốt — vì người ấy cũng muốn bạn được ổn.',
          'Bạn không cô đơn trong nỗi nhớ này. Và họ đang ở đó, dù không phải ngay bên cạnh.',
          'Khoảng cách chỉ làm cho sự gặp lại trở nên đáng trân trọng hơn mà thôi.',
        ].filter(Boolean).join(' ');

      case 'Hạnh phúc':
        return [
          'Thật tuyệt vời khi thấy bạn đang hạnh phúc hôm nay! Hãy tận hưởng trọn vẹn khoảnh khắc này.',
          energyNote,
          noteRef,
          'Hạnh phúc không phải lúc nào cũng phải là điều to lớn — đôi khi chỉ là một buổi sáng nhẹ nhàng, một nụ cười, hay một điều nhỏ bé đẹp đẽ.',
          'Hãy lưu giữ cảm giác này — viết ra hoặc ghi lại trong album kỷ niệm, để những ngày không vui hơn bạn có thể nhìn lại.',
          gratitudeRef,
          'Hãy chia sẻ niềm vui này với người bạn quan tâm — hạnh phúc nhân đôi khi được chia sẻ.',
          'Những khoảnh khắc hạnh phúc như hôm nay là lý do để chúng ta tiếp tục yêu cuộc sống.',
          'Cảm ơn bạn vì đã ghi lại điều này — mỗi khoảnh khắc vui đều xứng đáng được nhớ đến.',
          'Mong bạn giữ được nguồn năng lượng tích cực này thật lâu.',
        ].filter(Boolean).join(' ');

      case 'Bình yên':
        return [
          'Sự bình yên là một trong những điều quý giá nhất của tâm hồn — và hôm nay bạn đang có được nó.',
          energyNote,
          noteRef,
          'Hãy hít thở thật sâu và cảm nhận sự tĩnh lặng này — không phải ai cũng dễ dàng có được những khoảnh khắc như vậy.',
          'Bình yên không phải là vắng mặt của khó khăn, mà là cách chúng ta chọn phản ứng với chúng.',
          gratitudeRef,
          'Hãy dùng khoảng không gian yên tĩnh này để làm điều gì đó nuôi dưỡng tâm hồn — đọc sách, nghe nhạc, hay chỉ đơn giản là ngồi yên.',
          'Đây cũng là lúc tốt để kết nối với người bạn quan tâm — không vì bất kỳ lý do cụ thể nào, chỉ là muốn ở bên nhau.',
          'Mong bạn giữ được trạng thái bình yên này lâu nhất có thể.',
          'Những ngày bình yên như hôm nay là những trang đẹp nhất trong cuốn nhật ký cuộc đời.',
        ].filter(Boolean).join(' ');

      case 'Phấn khích':
        return [
          'Wow — bạn đang tràn đầy năng lượng và phấn khích hôm nay! Đó là một điều tuyệt vời.',
          energyNote,
          noteRef,
          'Hãy tận dụng nguồn nhiệt huyết này để làm những điều bạn đã trì hoãn từ lâu.',
          'Nhưng cũng nhớ rằng: sự phấn khích cần được hướng đúng để không đốt cháy năng lượng một cách lãng phí.',
          gratitudeRef,
          'Hãy lên kế hoạch một điều thú vị cùng người bạn quan tâm — những kỷ niệm đẹp nhất thường được tạo ra trong những ngày như thế này.',
          'Chia sẻ năng lượng tích cực này với những người xung quanh — nó có sức lan tỏa mạnh mẽ lắm đấy.',
          'Ngay cả trong sự phấn khích, hãy nhớ chăm sóc cơ thể — uống đủ nước và đừng bỏ bữa nhé.',
          'Cứ để ngọn lửa nhiệt huyết này cháy sáng — nhưng cũng biết lúc nào nên cho nó nghỉ ngơi.',
        ].filter(Boolean).join(' ');

      default:
        return [
          'Mỗi ngày mang đến những cảm xúc khác nhau, và tất cả đều đáng được lắng nghe và trân trọng.',
          energyNote,
          noteRef,
          'Việc ghi chép lại cảm xúc của mình là một cách rất đẹp để thấu hiểu bản thân sâu hơn.',
          gratitudeRef,
          'Hãy nhớ rằng bạn không cần phải luôn mạnh mẽ — đôi khi chỉ cần thành thật với chính mình là đủ.',
          'Dù hôm nay thế nào, bạn vẫn đang làm rất tốt với những gì mình có.',
          'Hãy đối xử thật dịu dàng với bản thân — như cách bạn đối xử với người bạn thân thiết nhất.',
        ].filter(Boolean).join(' ');
    }
  }
};
