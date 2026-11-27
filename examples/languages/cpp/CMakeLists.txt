cmake_minimum_required(VERSION 3.20)
project(acceptance LANGUAGES CXX)
add_executable(sum_app main.cpp)
set_target_properties(sum_app PROPERTIES OUTPUT_NAME real_program RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/nested-output")
