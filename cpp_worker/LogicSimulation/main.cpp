#include "tools/base64.hpp"
#include "tools/msgpack.h"
#include "tools/json.hpp"

#include <iostream>
#include <vector>
#include <iterator>
#include <span>


using json = nlohmann::json;

int main() {
    // std::string input = R"({"gates":[{"x":580,"y":120,"type":"INPUT","state":"off","rotation":0,"inputs":[],"output":{"x":600,"y":130},"id":null},{"x":580,"y":160,"type":"INPUT","state":"off","rotation":0,"inputs":[],"output":{"x":600,"y":170},"id":null},{"x":700,"y":120,"type":"AND","state":"off","rotation":0,"inputs":[{"x":700,"y":130},{"x":700,"y":150},{"x":700,"y":170}],"output":{"x":760,"y":150},"id":null},{"x":840,"y":140,"type":"OUTPUT","state":"off","rotation":0,"inputs":[{"x":840,"y":150}],"output":{"x":null,"y":null},"id":null}],"wires":[{"startX":840,"startY":150,"endX":760,"endY":150,"state":"off"},{"startX":700,"startY":130,"endX":600,"endY":130,"state":"off"},{"startX":600,"startY":170,"endX":700,"endY":170,"state":"off"}]})";
    //
    // // Parse outer JSON
    // json j = json::parse(input);
    //
    // // "data" is just a string right now
    // std::string inner_str = j["gates"];
    // std::cout << "Inner string: " << inner_str << "\n";
    //
    // // Step 2: Parse inner string as JSON
    // json inner = json::parse(inner_str);
    // std::cout << "Inner JSON: " << inner.dump(2) << "\n";

    // auto decoded_str = base64::from_base64("gqVnYXRlc5SIoXjM3KF5zKCkdHlwZaVJTlBVVKVzdGF0ZaNvZmaocm90YXRpb24ApmlucHV0c5Cmb3V0cHV0gqF4zPChecyqomlkwIiheMzcoXnMyKR0eXBlpUlOUFVUpXN0YXRlo29mZqhyb3RhdGlvbgCmaW5wdXRzkKZvdXRwdXSCoXjM8KF5zNKiaWTAiKF4zQFAoXnMoKR0eXBlo0FORKVzdGF0ZaNvZmaocm90YXRpb24ApmlucHV0c5OCoXjNAUChecyqgqF4zQFAoXnMvoKheM0BQKF5zNKmb3V0cHV0gqF4zQF8oXnMvqJpZMCIoXjNAcyhecy0pHR5cGWmT1VUUFVUpXN0YXRlo29mZqhyb3RhdGlvbgCmaW5wdXRzkYKheM0BzKF5zL6mb3V0cHV0gqF4wKF5wKJpZMCld2lyZXOThaZzdGFydFjNAcymc3RhcnRZzL6kZW5kWM0BfKRlbmRZzL6lc3RhdGWjb2ZmhaZzdGFydFjM8KZzdGFydFnMqqRlbmRYzQFApGVuZFnMqqVzdGF0ZaNvZmaFpnN0YXJ0WM0BQKZzdGFydFnM0qRlbmRYzPCkZW5kWczSpXN0YXRlo29mZg==");
    //
    // std::span<const std::byte> byte_span{
    //     reinterpret_cast<const std::byte*>(decoded_str.data()),
    //     decoded_str.size()
    // };

    // Read all stdin into a vector<char>
    // std::vector<char> buffer(
    //     std::istreambuf_iterator<char>(std::cin),
    //     std::istreambuf_iterator<char>()
    // );
    //
    // // Reinterpret as bytes
    // std::span<const std::byte> bytes{
    //     reinterpret_cast<const std::byte*>(buffer.data()),
    //     buffer.size()
    // };
    //
    // // Pass into msgpack23
    // msgpack23::Unpacker unpacker(bytes);
    //
    // // Now you can use unpacker to extract objects
    // while (unpacker.next()) {
    //     auto obj = unpacker.value();
    //     std::cout << obj << "\n";
    // }
    return 0;
}
