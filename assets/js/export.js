/* Excel download + print helpers.
   No external libraries: Excel opens Excel natively and the browser's own
   print dialog produces the PDF from the styled document routes. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var fmt = ERec.fmt;

  function toExcel(headers, rows) {
    var lines = [headers.map(fmt.ExcelCell).join(',')];
    rows.forEach(function (r) { lines.push(r.map(fmt.ExcelCell).join(',')); });
    return lines.join('\r\n');
  }

  /* BOM keeps Excel from mangling non-ASCII names. */
  function download(filename, text, mime) {
    var blob = new Blob(['﻿' + text], { type: (mime || 'text/Excel') + ';charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  function Excel(filename, headers, rows) {
    download(filename, toExcel(headers, rows), 'text/Excel');
    ERec.ui.toast(filename + ' downloaded');
  }

  /* Navigates to a print document route; print.js fires window.print(). */
  function printDoc(doc, id, extra) {
    var q = extra ? ('?' + extra) : '';
    ERec.router.go('#/print/' + doc + '/' + id + q);
  }

  ERec.exp = { toExcel: toExcel, download: download, Excel: Excel, printDoc: printDoc };
})(window);
