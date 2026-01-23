{ pkgs, ... }: {
  channel = "stable-23.11"; 

  packages = [
    pkgs.nodejs_20
  ];

  env = {
    GOOGLE_API_KEY = "AIzaSyAK3fdh5iPkxyca_5tU-JncZh-LcFU-T2w";
  };
  idx = {
    extensions = [
      "biomejs.biome"
      "bradlc.vscode-tailwindcss"
      "dbaeumer.vscode-eslint"
    ];

    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0"];
          manager = "web";
        };
      };
    };

    workspace = {
      onCreate = {
        npm-install = "npm install";
      };
      # Utiliser onStart pour ouvrir le fichier de ton choix au lieu du README
      onStart = {
        open-main = "code src/app.tsx";
      };
    };
  };
}
