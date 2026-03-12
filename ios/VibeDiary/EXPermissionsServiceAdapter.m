// expo-modules-core 55.x에서 EXPermissionsService가 EXModuleRegistry에
// 자동 등록되지 않아 expo-av 16.x에서 "permissions module not found" 오류 발생.
// 이 파일은 EXPermissionsService를 EXInternalModule로 등록하는 어댑터.

#import <ExpoModulesCore/EXDefines.h>
#import <ExpoModulesCore/EXPermissionsService.h>
#import <ExpoModulesCore/EXPermissionsInterface.h>
#import <ExpoModulesCore/EXInternalModule.h>

@interface EXPermissionsServiceAdapter : EXPermissionsService <EXInternalModule>
@end

@implementation EXPermissionsServiceAdapter

EX_REGISTER_MODULE()

+ (NSString *)moduleName {
  return @"EXPermissionsService";
}

+ (const NSArray<Protocol *> *)exportedInterfaces {
  return @[@protocol(EXPermissionsInterface)];
}

@end
