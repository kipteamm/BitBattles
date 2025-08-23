cmake_minimum_required(VERSION 3.29 FATAL_ERROR)
project(LogicSimulation)

set(CMAKE_CXX_STANDARD 23)

add_executable(LogicSimulation main.cpp
        tools/base64.hpp
        tools/msgpack.h
        tools/json.hpp
)
