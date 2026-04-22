{ pkgs }: {
  deps = [
    pkgs.python312
    pkgs.openssl
    pkgs.libffi
    pkgs.zlib
    pkgs.stdenv.cc.cc.lib
  ];
}
