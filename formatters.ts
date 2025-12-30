interface IFormatter {
  format(MIDInote: number, separator: string, key?: string): string;
}


export var rawFormatter: IFormatter = {
	format(MIDInote: number, separator: string): string {
		return `${MIDInote}${separator}`;
	}
}

export var scientificFormatter: IFormatter = {
	format(MIDInote: number, separator: string): string {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const noteName = noteNames[MIDInote % 12];
		const octave = Math.floor(MIDInote / 12) - 1;
		const noteString = `${noteName}${octave}${separator}`;
		return `${noteString}`;
	}
}

export var ABCFormatter: IFormatter = {
  format(MIDInote: number, _separator: string, key: string = 'C'): string {
    type Letter = 'A'|'B'|'C'|'D'|'E'|'F'|'G';
    type Acc = 'natural'|'sharp'|'flat';
    type Spelling = { letter: Letter; acc: Acc };

    const pc = ((MIDInote % 12) + 12) % 12;
    const octave = Math.floor(MIDInote / 12) - 1;

    // 12音 → 候補綴り（ダブルシャープ/フラットは扱わない：実用上十分）
    const candMap: Record<number, Spelling[]> = {
      0:  [{letter:'C', acc:'natural'}],
      1:  [{letter:'C', acc:'sharp'}, {letter:'D', acc:'flat'}],
      2:  [{letter:'D', acc:'natural'}],
      3:  [{letter:'D', acc:'sharp'}, {letter:'E', acc:'flat'}],
      4:  [{letter:'E', acc:'natural'}],
      5:  [{letter:'F', acc:'natural'}],
      6:  [{letter:'F', acc:'sharp'}, {letter:'G', acc:'flat'}],
      7:  [{letter:'G', acc:'natural'}],
      8:  [{letter:'G', acc:'sharp'}, {letter:'A', acc:'flat'}],
      9:  [{letter:'A', acc:'natural'}],
      10: [{letter:'A', acc:'sharp'}, {letter:'B', acc:'flat'}],
      11: [{letter:'B', acc:'natural'}],
    };

    const k = normalizeKey(key);
    const keyDefaults = keySignatureDefaults(k);
    const preferFlats = preferFlatsInTie(k);

    const candidates = candMap[pc] ?? [{letter:'C', acc:'natural'}];

    // 候補の中から「臨時記号が最小」になる綴りを選ぶ
    // 同点なら key=C はフラット優先など、ポリシーで決める
    let best = candidates[0];
    let bestCost = 999;

    for (const cand of candidates) {
      const def = keyDefaults[cand.letter];
      const needed = cand.acc !== def;
      const cost = needed ? 1 : 0;

      if (cost < bestCost) {
        best = cand;
        bestCost = cost;
        continue;
      }

      if (cost === bestCost) {
        // tie-break（例：Cはフラット優先、フラット系キーはフラット優先）
        if (preferFlats) {
          if (cand.acc === 'flat' && best.acc !== 'flat') best = cand;
        } else {
          if (cand.acc === 'sharp' && best.acc !== 'sharp') best = cand;
        }
      }
    }

    const accPrefix = accidentalPrefix(best.acc, keyDefaults[best.letter]);
    const noteBody = applyAbcOctave(best.letter, octave);

    return `${accPrefix}${noteBody}`;

    // ---- helpers ----

    function normalizeKey(x: string): string {
      return x.trim();
    }

    function preferFlatsInTie(x: string): boolean {
      // あなたの希望：Cはフラット寄り
      if (x === 'C') return true;
      // それ以外のフラット系
      return ['F','Bb','Eb','Ab','Db','Gb','Cb'].includes(x);
    }

    function keySignatureDefaults(x: string): Record<Letter, Acc> {
      const defaults: Record<Letter, Acc> = {
        A:'natural', B:'natural', C:'natural', D:'natural', E:'natural', F:'natural', G:'natural'
      };

      const sharpsOrder: Letter[] = ['F','C','G','D','A','E','B'];
      const flatsOrder:  Letter[] = ['B','E','A','D','G','C','F'];

      const keyToSharpsCount: Record<string, number> = {
        'C':0,'G':1,'D':2,'A':3,'E':4,'B':5,'F#':6,'C#':7,
      };
      const keyToFlatsCount: Record<string, number> = {
        'C':0,'F':1,'Bb':2,'Eb':3,'Ab':4,'Db':5,'Gb':6,'Cb':7,
      };

      if (x in keyToSharpsCount) {
        const n = keyToSharpsCount[x];
        for (let i = 0; i < n; i++) defaults[sharpsOrder[i]] = 'sharp';
      } else if (x in keyToFlatsCount) {
        const n = keyToFlatsCount[x];
        for (let i = 0; i < n; i++) defaults[flatsOrder[i]] = 'flat';
      }

      return defaults;
    }

    function accidentalPrefix(acc: Acc, defaultAcc: Acc): string {
      // 調号と同じなら臨時記号なし
      if (acc === defaultAcc) return '';
      if (acc === 'sharp') return '^';
      if (acc === 'flat') return '_';
      return '=';
    }

    function applyAbcOctave(letter: Letter, oct: number): string {
      // あなたの元のルールを踏襲
      if (oct <= 4) {
        let out = letter;
        for (let i = oct; i < 4; i++) out += ',';
        return out;
      } else {
        let out = letter.toLowerCase();
        for (let i = oct; i > 5; i--) out += "'";
        return out;
      }
    }
  }
};
