{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
  ];

  # Sets environment variables in the workspace
  env = {};

  idx = {
    # Search for the extensions you want on https://open-vsx.org/
    extensions = [
      "biomejs.biome"
    ];

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        npm-install = "npm install";
      };
      # Runs when the workspace is (re)started
      onStart = {
        # Example: start a dev server
        # dev-server = "npm run dev";
      };
    };

    # Preview configuration
    previews = {
      enable = true;
      previews = {
        web = {
          # Example: run "npm run dev" with PORT set to IDX's assigned port
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}
