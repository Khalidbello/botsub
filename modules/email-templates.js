// function to compose successfull trn0ansaction mail
export function successfullDeliveryMail({ product, network, status, id, txRef, price, date }) {
  const composedMail = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt</title>
      <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
        }

        .container {
            margin: 0 auto;
            max-width: 600px;
            padding: 20px;
            background-color: #ffffff;
            border: 1px solid #ccc;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #333333;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
            color: #333333;
        }

        .total-row {
            font-weight: bold;
        }

        .total-row td {
            color: #ff6600;
        }

        p {
            margin-top: 30px;
            text-align: center;
            color: #666666;
        }
      </style>
      </head>
      <body>
        <div class="container">
          <h1>Qsub Receipt</h1>

          <table>
            <tr>
              <th>Product</th>
              <td>${product}</td>
            </tr>
            <tr>
                <th>Network</th>
                <td>${network}</td>
            </tr>
            <tr>
              <th>Price</th>
                <td>${price}</td>
            </tr>
            <tr>
                <th>Status</th>
                <td>${status}</td>
            </tr>
            <tr>
                <th>Transaction ID</th>
                <td>${id}</td>
            </tr>
            <tr>
                <th>tx_ref</th>
                <td>${txRef}</td>
            <tr>
                <th>Date</th>
                <td>${date}</td>
            </tr>
          </table>

          <p>Thank you for your purchase!</p>
        </div>
    </body>
  </html>`;
  return composedMail;
} // end of succesfullDeliveryMail

export function failedDeliveryMail() {
  const composedMail = `
  `;
  return composedMail;
} // end of failedDeliveryMail

export function failedTransactionMail() {
  const composedMail = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Failed Transaction</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
          }

          .container {
            margin: 0 auto;
            max-width: 600px;
            padding: 20px;
            background-color: #ffffff;
            border: 1px solid #ccc;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }

          h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #333333;
          }

          p {
            margin-bottom: 20px;
            color: #555555;
          }
  
          table {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
          }

          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
            color: #333333;
          }

          th {
            font-weight: bold;
          }

          .contact-info {
            margin-top: 20px;
            font-size: 14px;
          }

          .contact-info p {
            margin-bottom: 5px;
          }
        </style>
      </head> 
      <body>
        <div class="container">
          <h1> Qsub Failed Transaction</h1>

          <p>Dear esteemed customer,</p>

          <p> 
            We regret to inform you that your recent transaction on [Date] has failed to process. 
            We apologize for any inconvenience this may have caused. The details of the failed transaction are as follows:
          </p>

        <table>
            <tr>
                <th>Product:</th>
                <td>[Transaction ID]</td>
            </tr>
            <tr>
                <th>Transaction ID:</th>
                <td>[Transaction ID]</td>
            </tr>
            <tr>
                <th>Amount:</th>
                <td>[Transaction Amount]</td>
            </tr>
            <tr>
                <th>Payment Method:</th>
                <td>[Payment Method]</td>
            </tr>
        </table>

        <p>
          Please review the provided information and ensure that your payment details are accurate. 
          If you believe this was an error or require further assistance, please contact our customer support team:
        </p>

        <div class="contact-info">
            <p>Email: [Support Email]</p>
            <p>Phone: [Support Phone Number]</p>
        </div>

        <p>Thank you for your understanding.</p>

        <p>Sincerely,</p>
        <p>The [Company Name] Team</p>
      </div>
    </body>
  </html>`;
  return composedMail;
}
