/* The Unwired — the Lab run.
   Shared by every Lab page. Each stage records what the visitor did with
   UnwiredLab.save(stage, data); the "Your run" panel reads it back and can
   pre-fill the contact form with it.

   Stored in sessionStorage only: it lives for this tab and is gone when the
   tab closes. Nothing is sent anywhere. Every read and write is guarded, so
   a blocked storage leaves the panel showing "not tried yet", never broken. */
(function () {
  'use strict';

  var KEY = 'unwired-lab-run';

  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(stage, data) {
    var all = load();
    all[stage] = data;
    try { sessionStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* private mode: the panel just stays empty */ }
    render();
  }
  window.UnwiredLab = { save: save, load: load };

  var STAGES = [
    { key: 'tolerance', num: '01', name: 'Set the line', href: 'lab-tolerance.html' },
    { key: 'handover', num: '02', name: 'Pass the handover', href: 'lab-handover.html' },
    { key: 'documents', num: '03', name: 'Worst-document bench', href: 'lab-documents.html' }
  ];

  /* one plain sentence per stage, used on the page and in the message */
  function sentence(key, d) {
    if (!d) return null;
    if (key === 'tolerance') {
      return 'Left the price tolerance at ' + d.pct.toFixed(1) + '%: ' + d.touch + ' of 200 invoices posted on their own, ' +
        d.person + ' went to a person, ' + d.slip + ' problems slipped through.';
    }
    if (key === 'handover') {
      return d.done === 3 ? 'Passed the handover test: changed a tolerance, added an escalation rule and explained a decision.'
        : d.done + ' of 3 handover tasks done.';
    }
    if (key === 'documents') {
      return 'Worked through ' + d.docs + ' of 6 documents. Of the ' + d.wrong + ' fields that were actually wrong, you would have checked ' +
        d.youCaught + ' and the agent flagged ' + d.agentCaught + ' at a ' + d.threshold + '% review threshold.';
    }
    return null;
  }

  function render() {
    var data = load();
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-run]'), function (box) {
      var list = box.querySelector('[data-lab-run-list]');
      var send = box.querySelector('[data-lab-run-send]');
      if (!list) return;
      list.innerHTML = '';
      var any = false;
      STAGES.forEach(function (s) {
        var text = sentence(s.key, data[s.key]);
        if (text) any = true;
        var li = document.createElement('li');
        li.className = 'lab-run__row' + (text ? ' is-done' : '');
        var num = document.createElement('span');
        num.className = 'lab-run__num';
        num.textContent = s.num;
        var body = document.createElement('span');
        var name = document.createElement('strong');
        name.textContent = s.name + '. ';
        body.appendChild(name);
        if (text) {
          body.appendChild(document.createTextNode(text));
        } else {
          body.appendChild(document.createTextNode('Not tried yet. '));
          var a = document.createElement('a');
          a.href = s.href;
          a.setAttribute('data-wipe-link', '');
          a.textContent = 'Open stage ' + s.num;
          body.appendChild(a);
        }
        li.appendChild(num);
        li.appendChild(body);
        list.appendChild(li);
      });
      if (send) send.hidden = !any;
    });
  }

  /* pre-fill the contact form, then let site.js open it as usual */
  function message() {
    var data = load();
    var lines = ['From the Lab:'];
    STAGES.forEach(function (s) {
      var t = sentence(s.key, data[s.key]);
      if (t) lines.push('- ' + s.num + ' ' + s.name + ': ' + t);
    });
    lines.push('', 'The process I would like to try this on: ');
    return lines.join('\n');
  }

  function start() {
    render();
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-run-send]'), function (b) {
      b.addEventListener('click', function () {
        /* the message is filled in; site.js opens the dialog with the
           focus on Name, which the visitor still has to give us */
        var f = document.getElementById('f-msg');
        if (f) f.value = message();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
