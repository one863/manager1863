{ pkgs, ... }: {
  channel = "stable-23.11"; 

  packages = [
    pkgs.nodejs_20
  ];

  env = {
    
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
        open-main = "code docs/blueprint/00_gemini.md";
      };
    };
  };
}
