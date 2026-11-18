// Generated from the Blender scenes (see DESIGN.md, "Device scenes"). Do not edit by hand: run scripts/devices/render.sh.
/** A rendered room for a work card: a picture of the devices with black screens, and each screen's pose, so the
 *  page can lay the real screenshots onto them. Poses are CSS: the scene is 100cqw wide, seen with perspective
 *  `perspective` cqw from its centre; a screen box of w x h cqw sits at its centre, moved by t (cqw), turned by m. */
export type DeviceScreen = { w: number; h: number; t: [number, number, number]; m: number[] };
export type DeviceScene = {
  width: number; height: number; perspective: number;
  screens: { laptop: DeviceScreen; phone?: DeviceScreen };
  /** % of the field */
  pin: { x: number; y: number; side: "l" | "r" }; dot: { x: number; y: number }; leader: string;
};

export const DEVICE_SCENES: Record<string, DeviceScene> = {
  "edith": {
    "width": 2400,
    "height": 1080,
    "perspective": 138.8889,
    "screens": {
      "laptop": {
        "w": 41.2917,
        "h": 25.8073,
        "t": [
          -36.245,
          -14.7489,
          7.8674
        ],
        "m": [
          0.892267,
          -0.097171,
          -0.440928,
          0,
          0.154425,
          0.98335,
          0.095786,
          0,
          0.424279,
          -0.153557,
          0.892417,
          0,
          0,
          0,
          0,
          1
        ]
      },
      "phone": {
        "w": 10.9245,
        "h": 23.6418,
        "t": [
          27.0258,
          -3.6613,
          0.5359
        ],
        "m": [
          0.992881,
          -0.025633,
          -0.116316,
          0,
          0.026793,
          0.999606,
          0.008417,
          0,
          0.116054,
          -0.011473,
          0.993177,
          0,
          0,
          0,
          0,
          1
        ]
      }
    },
    "pin": {
      "x": 62,
      "y": 20,
      "side": "l"
    },
    "dot": {
      "x": 51.3,
      "y": 21.7
    },
    "leader": "M 51.3 21.7 C 56.1 21.7, 57.2 20, 62 20"
  },
  "clinky": {
    "width": 2400,
    "height": 1080,
    "perspective": 138.8889,
    "screens": {
      "laptop": {
        "w": 41.1182,
        "h": 25.6989,
        "t": [
          -26.3601,
          -20.394,
          -7.128
        ],
        "m": [
          0.956869,
          0.066819,
          0.282731,
          0,
          -0.099363,
          0.989772,
          0.102366,
          0,
          -0.272999,
          -0.126044,
          0.953721,
          0,
          0,
          0,
          0,
          1
        ]
      },
      "phone": {
        "w": 11.4063,
        "h": 24.6843,
        "t": [
          26.6169,
          -4.5328,
          0.7718
        ],
        "m": [
          0.992308,
          -0.028472,
          -0.120472,
          0,
          0.027847,
          0.999589,
          -0.006868,
          0,
          0.120618,
          0.00346,
          0.992693,
          0,
          0,
          0,
          0,
          1
        ]
      }
    },
    "pin": {
      "x": 68,
      "y": 20,
      "side": "l"
    },
    "dot": {
      "x": 62.9,
      "y": 21.2
    },
    "leader": "M 62.9 21.2 C 65.2 21.2, 65.7 20, 68 20"
  },
  "c-sat": {
    "width": 2400,
    "height": 1080,
    "perspective": 100,
    "screens": {
      "laptop": {
        "w": 39.1175,
        "h": 24.4484,
        "t": [
          -11.4835,
          -16.9962,
          -8.7514
        ],
        "m": [
          0.9283,
          0.060293,
          0.366911,
          0,
          -0.114902,
          0.984985,
          0.12885,
          0,
          -0.353633,
          -0.16177,
          0.921289,
          0,
          0,
          0,
          0,
          1
        ]
      }
    },
    "pin": {
      "x": 30,
      "y": 28,
      "side": "r"
    },
    "dot": {
      "x": 38.7,
      "y": 27.7
    },
    "leader": "M 38.7 27.7 C 34.8 27.7, 33.9 28, 30 28"
  },
  "debt-report": {
    "width": 1600,
    "height": 1240,
    "perspective": 133.3333,
    "screens": {
      "laptop": {
        "w": 45.2999,
        "h": 28.3124,
        "t": [
          -34.1605,
          -22.7717,
          4.6242
        ],
        "m": [
          0.959235,
          -0.061822,
          -0.275765,
          0,
          0.096658,
          0.988702,
          0.114569,
          0,
          0.265566,
          -0.136553,
          0.954373,
          0,
          0,
          0,
          0,
          1
        ]
      },
      "phone": {
        "w": 15.1139,
        "h": 32.7081,
        "t": [
          28.4805,
          -7.1129,
          -0.8044
        ],
        "m": [
          0.995255,
          0.021286,
          0.094947,
          0,
          -0.021889,
          0.999746,
          0.005313,
          0,
          -0.09481,
          -0.007366,
          0.995468,
          0,
          0,
          0,
          0,
          1
        ]
      }
    },
    "pin": {
      "x": 36,
      "y": 7,
      "side": "r"
    },
    "dot": {
      "x": 39.3,
      "y": 19.2
    },
    "leader": "M 39.3 19.2 C 37.8 19.2, 37.5 7, 36 7"
  },
  "dont-call-me": {
    "width": 1600,
    "height": 1240,
    "perspective": 150,
    "screens": {
      "laptop": {
        "w": 53.6566,
        "h": 33.5354,
        "t": [
          -14.8927,
          -32.2552,
          -10.2089
        ],
        "m": [
          0.907959,
          0.140614,
          0.394762,
          0,
          -0.143326,
          0.989413,
          -0.022776,
          0,
          -0.393786,
          -0.0359,
          0.918501,
          0,
          0,
          0,
          0,
          1
        ]
      }
    },
    "pin": {
      "x": 59,
      "y": 6,
      "side": "l"
    },
    "dot": {
      "x": 56.2,
      "y": 12.9
    },
    "leader": "M 56.2 12.9 C 57.5 12.9, 57.7 6, 59 6"
  }
};
