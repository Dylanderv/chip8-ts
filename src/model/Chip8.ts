
const chip8CharacterSprites = [
  0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
  0x20, 0x60, 0x20, 0x20, 0x70, // 1
  0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
  0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
  0x90, 0x90, 0xF0, 0x10, 0x10, // 4
  0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
  0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
  0xD0, 0x10, 0x20, 0x40, 0x40, // 7
  0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
  0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
  0xF0, 0x90, 0xF0, 0x90, 0x90, // A
  0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
  0xF0, 0x80, 0x80, 0x80, 0xF0, // C
  0xE0, 0x90, 0x90, 0x90, 0xE0, // D
  0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
  0xF0, 0x80, 0xF0, 0x80, 0x80 // F
]

export class Chip8 {
  private memory: Uint8Array;
  // Program Counter : 16 bit (store currently executing address)
  private pc: number;
  // Stack Pointer : 8 bit (point to the topmost level of the stack)
  private sp: number;
  // Stack : Array of 16 16 bit values (store the adress that the interpreter should return to when finished with a subroutine)
  private stack: Uint16Array;
  // Register : Array of 16 16b bit values (store memory addresses)
  private register: Uint16Array;
  // I Register : 16 bit
  private iRegister: number;
  // Delay timer : substract 1 every 60hz, desactivates when reached 0
  private dt: number;
  // Sound timer : same as delay, but will perform a sound whenever the value is greater than 0 (the sound has only one tone to define)
  private st: number;
  // Key state : array of 16 boolean (one for each key)
  private keys: Array<boolean>;
  // Graphic buffer : array of 64x32 bits
  private gBuf: Array<number>;
  // Draw flag : boolean
  private drawFlag: boolean;

  constructor() {
    this.reset();
  }

  public reset() {
    this.memory = new Uint8Array(4096);
    this.pc = 0;
    this.sp = 0;
    this.stack = new Uint16Array(16);
    this.register = new Uint16Array(16);
    this.iRegister = 0x0000;
    this.dt = 0;
    this.st = 0;
    this.keys = new Array(16);
    this.keys.fill(false);
    this.gBuf = new Array(64 * 32);
    this.drawFlag = false;
    this.initMemory();
  }

  private initMemory() {
    // Init the 80 first value of memory with sprites data
    chip8CharacterSprites.forEach((elem, index) => {
      this.memory[index] = elem;
    });
  }

  public emulateCycle() {
    // Fetch Opcode
    let opcode = this.fetchOpcode();
    // Decode and Execute Opcode
    this.decodeAndExecute(opcode);

    // Update Timers
  }

  private fetchOpcode() {
    // Opcode is on 2 bytes
    // Shifting the first byte and apply the bitwise OR operation to merge both
    return this.memory[this.pc] << 8 | this.memory[this.pc + 1];
  }

  private decodeAndExecute(opcode: number) {
    let x,y, nn, nnn;
    switch(opcode & 0xF000) {
      case 0x0000:
        switch(opcode & 0x000F){
          case 0x0000:
            // 00E0
            // Clears the screen
            for (let i = 0; i < 2048; i++) {
              this.gBuf[i] = 0;
            }
            this.drawFlag = true;
            this.pc += 2;
            break;
          case 0x000E:
            // 00EE
            // Returns from a subroutine
            --this.sp;
            this.pc = this.stack[this.sp];
            this.pc += 2;
            break;
        }
        break;
      case 0x1000:
        // 1NNN flow, goto NNN;
        // Jumps to adress NNN
        this.pc = opcode & 0x0FFF;
        break;
      case 0x2000:
        // 2NNN flow, *(0xNNN)()
        // Calls subroutine at NNN
        this.stack[this.sp] = this.pc;
        ++this.sp;
        this.pc = opcode & 0x0FFF;
        break;
      case 0x3000:
        // 3XNN, Cond, if(Vx == NN)
        // Skip the next instruction if Vx equal NN
        nn = (opcode & 0x00FF);
        x = (opcode & 0x0F00) >> 8
        if (this.register[x] === nn) {
          this.pc += 4;
        } else {
          this.pc += 2;
        }
        break;
      case 0x4000:
        // 4XNN, Cond, if (Vx != NN)
        // Skip the next instruction if Vx doesn't equal NN.
        nn = (opcode & 0x00FF);
        x = (opcode & 0x0F00) >> 8
        if (this.register[x] !== nn) {
          this.pc += 4;
        } else {
          this.pc += 2;
        }
        break;
      case 0x5000:
        // 5XY0, cond, if(Vx == Vy)
        // Skip the next instruction if Vx equals Vy
        x = (opcode & 0x0F00) >> 8;
        y = (opcode & 0x00F0) >> 4;
        if (this.register[x] === this.register[y]) {
          this.pc += 4;
        } else {
          this.pc += 2;
        }
        break;
      case 0x6000:
        // 6XNN, const, Vx = NN
        // Set Vx to NN
        x = (opcode & 0x0F00) >> 8;
        nn = (opcode & 0x00FF);
        this.register[x] = nn;
        this.pc += 2;
        break;
      case 0x7000:
        // 7XNN, const, Vx += NN
        // adds NN to Vx
        x = (opcode & 0x0F00) >> 8;
        nn = (opcode & 0x00FF);
        this.register[x] += nn;
        this.pc += 2;
        break;
      case 0x8000:
        switch(opcode & 0x000F) {
          case 0x0000:
            // 8XY0, assing, Vx = Vy
            // Sets Vx to the value of Vy
            x = (opcode & 0x0F00) >> 8;
            y = (opcode & 0x00F0) >> 4;
            this.register[x] = this.register[y];
            this.pc += 2;
            break;
          case 0x0001:
            // 8XY1, BitOp, Vx = Vx|Vy
            // Set Vx to Vx or Vy (bitwise Or operation)
            x = (opcode & 0x0F00) >> 8;
            y = (opcode & 0x00F0) >> 4;
            this.register[x] = this.register[x] | this.register[y];
            this.pc += 2;
            break;
          case 0x0002:
            // 8XY2, BitOp, Vx = Vx&Vy
            // Set Vx to Vx and Vy (bitwise And operation)
            x = (opcode & 0x0F00) >> 8;
            y = (opcode & 0x00F0) >> 4;
            this.register[x] = this.register[x] & this.register[y];
            this.pc += 2;
            break;
          case 0x0003:
            // 8XY3, BitOp, Vx = Vx^Vy
            // Set Vx to Vx xor Vy
            x = (opcode & 0x0F00) >> 8;
            y = (opcode & 0x00F0) >> 4;
            this.register[x] = this.register[x] ^ this.register[y];
            this.pc += 2;
            break;
          case 0x0004:
            // 8XY4, Math, Vx += Vy
            // Add Vy to Vx, Vf is set to 1 when there's a carrym and to 0 when there isn't
            x = opcode & (0x0F00 >> 8);
            y = opcode & (0x00F0 >> 4);
            if (this.register[y] > (0xFF - this.register[x])) {
              this.register[0xF] = 1; // There is a carry !
            } else {
              this.register[0xF] = 0; // There isn't a carry !
            }
            this.register[x] += this.register[y];
            this.pc += 2;
            break;
          case 0x0005:
            // 8XY5, Math, Vx -= Vy
            // Vy is subtracted from Vx. Vf is set to 0 when there's a borrow, and 1 when there isn't
            x = (opcode & 0x0F00) >> 8;
            y = (opcode & 0x00F0) >> 4;
            if (this.register[y] > this.register[x]) {
              this.register[0xF] = 0; // There is a borrow !
            } else {
              this.register[0xF] = 1; // There isn't a borrow !
            }
            this.register[x] -+ this.register[y];
            this.pc += 2;
            break;
          case 0x0006:
            // 8XY6, BitOp, Vx >>= 1
            // Stores the least significant bit of Vx in Vf and then shifts Vx to the right by 1
            x = (opcode & 0x0F00) >> 8;
            this.register[0xF] = this.register[x] & 0x1;
            this.register[x] >>= 1;
            this.pc += 2;
            break;
          case 0x0007:
            // 8XY7, Math, Vx = Vy-Vx
            // Sets Vx to Vy minus Vx. Vf is set to 0 when there's a borrow, and 1 when there isn't
            x = (opcode & 0x0F00) >> 8;
            y = (opcode & 0x00F0) >> 4;
            if (this.register[y] < this.register[x]) {
              this.register[0xF] = 0;
            } else {
              this.register[0xF] = 1;
            }
            this.register[x] = this.register[y] - this.register[x];
            this.pc += 2;
            break;
          case 0x000E:
            // 8XYE, BitOp, Vx <<= 1
            // Stores the most significant bit of Vx in Vf and the shifts Vx to the left by 1
            x = (opcode & 0x0F00) >> 8;
            this.register[0xF] = this.register[x] >> 7;
            this.register[x] <<= 1;
            break;
        }
        break;
      case 0x9000:
        // 9XY0, Cond, if(Vx != Vy)
        // Skips the next instruction if Vx doesn't equal Vy
        x = (opcode & 0x0F00) >> 8;
        y = (opcode & 0x00F0) >> 4;
        if (this.register[x] !== this.register[y]) {
          this.pc += 4;
        } else {
          this.pc += 2;
        }
        break;
      case 0xA000:
        // ANNN, MEM, I = NNN
        // Set I to the address NNN
        this.iRegister = opcode & 0x0FFF;
        this.pc += 2;
        break;
      case 0xB000:
        // BNNN, flow, PC = V0 + NNN
        // Jumps to the adress NNN plus V0
        this.pc = this.register[0x0] + (opcode & 0x0FFF);
        break;
      case 0xC000:
        // CXNN, Rand, Vx = rand() & NN
        // Set Vx to the result of a bitwise and operation on a random number (typically 0 to 255) and NN
        x = (opcode & 0x0F00) >> 8;
        nn = (opcode & 0x00FF);
        this.register[x] = Math.floor(Math.random() * 0xFF) & nn;
        break;
      case 0xD000:
        // DXYN, Disp, Draw(Vx, Vy, N)
        // Draws a sprite at coordinate (Vx, Vy) that has a width of 8 pixels and a height of N pixels.
        // Each row of 8 pixels is read ad bit-0coded starting from memory location I;
        // I value doesn't change adter the execution of this instruction
        // As described above, Vf is set to 1 if any screen pixels are flipped from set to unset when the srpite is drawn
        // and 0 if that doesn't happen
        x = (opcode & 0x0F00) >> 8;
        y = (opcode & 0x00F0) >> 4;
        let height = opcode & 0x000F;
        let pixel;
        this.register[0xF] = 0;
        for (let yLine = 0; yLine < height; yLine ++) {
          pixel = this.memory[this.iRegister + yLine];
          for (let xLine = 0; xLine < 8; xLine ++) {
            if ((pixel & (0x80 >> xLine)) !== 0) {
              if (this.gBuf[(x + xLine + (y + yLine) * 64)] === 1) {
                this.register[0xF] = 1;
              }
              this.gBuf[x + xLine + ((y + yLine) * 64)] ^= 1;
            }
          }
        }
        this.drawFlag = true;
        this.pc += 2
        break;
      case 0xE000:
        switch (opcode & 0x000F){
          case 0x000E:
            // EX9E, KeyOp, if(key() == Vx)
            // Skips the next instruction if the key stored in Vx is pressed
            x = (opcode & 0x0F00) >> 8;
            if (this.keys[this.register[x]] === true) {
              this.pc += 4;
            } else {
              this.pc += 2;
            }
            break;
          case 0x0001:
            // EXA1, keyOp, if(key() != Vx)
            // Skips the next instruction id the key stored in Vx isn't pressed
            x = (opcode & 0x0F00) >> 8;
            if (this.keys[this.register[x]] === false) {
              this.pc += 4;
            } else {
              this.pc += 2;
            }
            break;
        }
        break;
      case 0xF007:
        switch (opcode & 0x00FF) {
          case 0x0007: 
            // FX07, timer, Vx = get_delay()
            // Set Vx to the value of the delay timer
            x = (opcode & 0x0F00) >> 8;
            this.register[x] = this.dt;
            this.pc += 2;
            break;
          case 0x000A:
            // FX0A, KeyOp, Vx = get_key();
            // A key press is awaited and then stored in Vx (blocking operation. all instruction halted until next key event)
            x = (opcode & 0x0F00) >> 8;
            let keyPressed = false;
            for (let i = 0; i < this.keys.length; i++) {
              if (this.keys[i] === true) {
                keyPressed = true;
                this.register[x] = i;
              }
            }
            if (!keyPressed) return;
            this.pc += 2;
            break;
          case 0x0018:
            // FX18, sound, sound_timer(Vx)
            // Sets the sound timer to Vx
            x = (opcode * 0x0F00) >> 8;
            this.st = this.register[x];
            this.pc += 2;
            break;
          case 0x001E:
            // FX1E, Mem, I += Vx
            // Adds Vx to I. Vf is set to 1 when there is a range overflow (I + Vx > 0xfff) and to 0 when there isn't
            x = (opcode * 0x0F00) >> 8;
            if (this.iRegister + this.register[x] > 0xFFF) {
              this.register[0xF] = 1;
            } else {
              this.register[0xF] = 0;
            }
            this.iRegister += this.register[x];
            this.pc += 2;
            break;
          case 0x0029:
            // FX29, MEM, I = sprite_addr[Vx]
            // sets I to the location of the sprite for the character in Vx. 
            // Character 0-F (in hexadecimal) are represented by a 4x5 font;
            x = (opcode & 0x0F00) >> 8;
            this.iRegister = this.register[x] * 0x5;
            this.pc += 2;
            break;
          case 0x0033:
            // Fx33, BCD, set_BCD(Vx); (*(i+0) = BCD(3)); (*(i+1) = BCD(2)); (*(i+2) = BCD(1));
            // Stores the binary-coded decimal representation of Vx, with the most significant of three digits at the address in I
            // the middle digit at I plus 1, and the least significant digit at I plus 2.
            // (in other word, take the decimal representation of Vx, place the hundreds digit in memory at llocation in I,
            // the tens difit at location in I+1 and the ones digit at location I+2)
            x = (opcode & 0x0F00) >> 8;
            this.memory[this.iRegister] = this.register[x] / 100;
            this.memory[this.iRegister + 1] = (this.register[x] / 10) % 10;
            this.memory[this.iRegister + 2] = (this.register[x] % 100) % 10;
            this.pc += 2;
            break;
          case 0x0055:
            // FX55, MEM, reg_dump(Vx, &I)
            // Stores V0 to Vx (including Vx) in memory stating at address I. The offset from I is increased by 1 for each value written
            // but I himself is left unmodified
            x = (opcode & 0x0F00) >> 8;
            for (let i = 0x0; i < x; i++) {
              this.memory[this.iRegister + i] = this.register[i];
            }
            // On the original interpreter, when the
            // operation is done, I = I + X + 1.
            this.iRegister += x + 1;
            this.pc += 2;
            break;
          case 0x0065:
            // Fx65, MEM, reg_load(Vx, &I)
            // Fills V0 to Vx (including Vx) with values from memory stating at address I. The offset from I is increased by 1 for each value written,
            // but I itself is left unmodified
            x = (opcode & 0x0F00) >> 8;
            for (let i = 0x0; i < x; i ++) {
              this.register[i] = this.memory[this.iRegister + i];
            }
            // On the original interpreter,
            // when the operation is done, I = I + X + 1.
            this.iRegister += x + 1;
            this.pc += 2;
            break;
          case 0x0015:
            // FX15, timer, delay_timer(Vx)
            // Sets the delay timer to Vx
            x = (opcode & 0x0F00) >> 8;
            this.dt = this.register[x];
            this.pc += 2;
            break;
        }
        break;
      default:
        // Unrecognized opcode
        console.log("Unrecognized Opcode", opcode);
    }
  }

}