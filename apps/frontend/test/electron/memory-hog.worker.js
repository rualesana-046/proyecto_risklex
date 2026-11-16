const retained = [];

for (;;) {
  retained.push(new Array(1_000_000).fill(retained.length));
}
