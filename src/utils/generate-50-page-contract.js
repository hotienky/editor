/**
 * Generator for realistic corporate contract data with custom page count
 * (Default: 100 pages)
 */
export function generateContract(pageCount = 100) {
  const parts = []

  parts.push(`
    <h1 style="text-align: center;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
    <h3 style="text-align: center;">Độc lập - Tự do - Hạnh phúc</h3>
    <hr />
    <h2 style="text-align: center; margin-top: 20px;">HỢP ĐỒNG NGUYÊN TẮC HỢP TÁC KINH DOANH VÀ CHUYỂN ĐỔI SỐ DOANH NGHIỆP TỔNG THỂ</h2>
    <p style="text-align: center;"><em>Số: ${pageCount}P-2026/HĐNT-KINDY-ENTERPRISE</em></p>
    <p style="text-align: justify;">Hôm nay, ngày 19 tháng 08 năm 2026, tại Trụ sở Tập đoàn Công nghệ, chúng tôi gồm có:</p>
    <p><strong>BÊN A (BÊN GIAO VIỆC / CHỦ ĐẦU TƯ): TẬP ĐOÀN CÔNG NGHỆ QUỐC TẾ</strong></p>
    <p>Địa chỉ: Tòa nhà Landmark 81, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh</p>
    <p>Đại diện: Ông <strong>Nguyễn Văn An</strong> - Chức vụ: Tổng Giám Đốc</p>
    <p><strong>BÊN B (BÊN THỰC HIỆN / ĐỐI TÁC): CÔNG TY TNHH GIẢI PHÁP SỐ TOÀN CẦU</strong></p>
    <p>Địa chỉ: Tầng 25, Tòa nhà Bitexco Financial Tower, Quận 1, TP. Hồ Chí Minh</p>
    <p>Đại diện: Bà <strong>Trần Thị Mai</strong> - Chức vụ: Giám Đốc Điều Hành</p>
    <p style="text-align: justify;">Hai bên thống nhất ký kết hợp đồng tổng thể gồm ${pageCount} phần điều khoản chuyên sâu như sau:</p>
  `)

  for (let i = 1; i <= pageCount; i++) {
    parts.push(`
      <h2>ĐIỀU ${i}: QUY ĐỊNH CHI TIẾT GIAI ĐOẠN ${i} - CHUYỂN ĐỔI SỐ &amp; VẬN HÀNH</h2>
      <p style="text-align: justify;"><strong>${i}.1 Mục tiêu cốt lõi:</strong> Bên B cam kết bàn giao toàn bộ các phân hệ chuyển đổi số giai đoạn ${i} đúng chuẩn kiến trúc phần mềm vi dịch vụ (Microservices), bảo mật đa tầng chuẩn ISO 27001 và vận hành ổn định 24/7 với cam kết SLA 99.99%.</p>
      <p style="text-align: justify;"><strong>${i}.2 Nghĩa vụ chi tiết của các bên:</strong></p>
      <ul>
        <li>Bên A có trách nhiệm cung cấp dữ liệu đầu vào, hồ sơ pháp lý và tài liệu nghiệp vụ phục vụ việc triển khai hệ thống giai đoạn ${i}.</li>
        <li>Bên B có trách nhiệm triển khai đội ngũ kỹ sư cao cấp, thực hiện kiểm thử tự động (Automated Testing), kiểm thử thâm nhập (Penetration Testing) và đảm bảo không có lỗ hổng bảo mật nghiêm trọng.</li>
        <li>Hai bên cùng phối hợp tổ chức các buổi đào tạo chuyển giao công nghệ cho ít nhất 500 nhân sự của Bên A.</li>
      </ul>
      <p style="text-align: justify;"><strong>${i}.3 Bảng phân bổ định mức tài chính và tiến độ giai đoạn ${i}:</strong></p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc;">Hạng mục công việc</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc;">Nhân sự phụ trách</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc;">Thời hạn bàn giao</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc;">Kinh phí nghiệm thu (VNĐ)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Thiết kế kiến trúc hệ thống và API phân hệ ${i}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Kỹ sư trưởng Bên B</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">30 ngày kể từ ngày ký</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">150,000,000</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Triển khai lập trình Core Engine và kiểm thử UAT</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Đội ngũ phát triển</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">60 ngày kế tiếp</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">350,000,000</td>
          </tr>
        </tbody>
      </table>
      <p style="text-align: justify; margin-top: 12px;"><strong>${i}.4 Xử lý vi phạm và chế tài:</strong> Trường hợp Bên B chậm tiến độ quá 15 ngày làm việc mà không có văn bản giải trình được Bên A chấp thuận, Bên B sẽ chịu phạt 0.5% giá trị hợp đồng giai đoạn ${i} cho mỗi ngày chậm trễ.</p>
    `)
  }

  parts.push(`
    <h2 style="margin-top: 30px;">ĐIỀU KHOẢN CHUNG VÀ XÁC NHẬN CỦA ĐẠI DIỆN HỢP PHÁP</h2>
    <p style="text-align: justify;">Hợp đồng này có hiệu lực kể từ ngày ký và được lập thành 04 (bốn) bản chính có giá trị pháp lý như nhau, mỗi bên giữ 02 (hai) bản để thực hiện.</p>
    <table style="width: 100%; border: none; margin-top: 40px;">
      <tbody>
        <tr>
          <td style="text-align: center; width: 50%; border: none;">
            <strong>ĐẠI DIỆN BÊN A</strong><br />
            <em>(Ký, ghi rõ họ tên và đóng dấu)</em><br /><br /><br /><br />
            <strong>NGUYỄN VĂN AN</strong><br />
            Tổng Giám Đốc
          </td>
          <td style="text-align: center; width: 50%; border: none;">
            <strong>ĐẠI DIỆN BÊN B</strong><br />
            <em>(Ký, ghi rõ họ tên và đóng dấu)</em><br /><br /><br /><br />
            <strong>TRẦN THỊ MAI</strong><br />
            Giám Đốc Điều Hành
          </td>
        </tr>
      </tbody>
    </table>
  `)

  return parts.join('\n')
}

export const generate50PageContract = () => generateContract(50)
export const generate100PageContract = () => generateContract(100)
export const generate200PageContract = () => generateContract(200)
