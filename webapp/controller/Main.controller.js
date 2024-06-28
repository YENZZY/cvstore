sap.ui.define([
    "store/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/m/Text",
    "sap/m/Dialog",
    "sap/m/DialogType",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/MessageToast",
    "sap/ui/model/FilterOperator",
    "sap/ui/layout/form/SimpleForm",
    "sap/ui/layout/HorizontalLayout",
    "sap/ui/layout/VerticalLayout",
    "sap/ui/core/UIComponent",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/ui/core/library"
    ],
    function (Controller, JSONModel, MessageBox, Filter, Text, Dialog, DialogType, Input, Button, ButtonType, MessageToast, FilterOperator, SimpleForm, HorizontalLayout, VerticalLayout,UIComponent,ValueHelpDialog, Column,Label,coreLibrary) {
    "use strict";
    var SortOrder = coreLibrary.SortOrder;
    
    return Controller.extend("store.controller.Main", {
        onInit: function () {
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);
        },
        
        _onRouteMatched: function () {
            this._getData();
        },
    
        _getData: function () {
            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기
            var oSmanageModel = this.getOwnerComponent().getModel("smanageData");
            
            this._getODataRead(oMainModel, "/Head").done(
                function (aGetData) {
                   // StoreCode를 기준으로 오름차순 정렬
                    aGetData.sort(function (a, b) {
                        return a.StoreCode.localeCompare(b.StoreCode);
                    });
                    this.setModel(new JSONModel(aGetData), "storeModel");

                }.bind(this)).fail(function () {
                    MessageBox.information("지점 조회를 할 수 없습니다.");
                });
    
            this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
                var storecodes = aGetData.filter(function (codedata) {
                    return codedata.StoreStatus === 'Y';
                }).map(function (codedata) {
                    return {
                        StoreCode: codedata.StoreCode,
                        StoreName: codedata.StoreName,
                        Uuid : codedata.Uuid,
                        StoreStatus: codedata.StoreStatus
                    };
                });

                var oCodeModel = new JSONModel({ storecodes: storecodes });
                this.setModel(oCodeModel, "codeModel");
            }.bind(this)).catch(function () {
                MessageBox.error("브랜드명을 불러올 수 없습니다.");
            });
        },
        
        onClosed: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            var oSmanageModel = this.getOwnerComponent().getModel("smanageData");
            var getData = this.getView().getModel("codeModel").getData();
            var selectedStoreCode = this.getView().byId("selectcvname").getSelectedKey();
        
            // 선택한 편의점명에 해당하는 데이터 찾기
            var oRowData = getData.storecodes.find(function (item) {
                return item.StoreCode === selectedStoreCode;
            });
        
            if (oRowData) {
                // codeModel에서 선택한 편의점의 상태를 '사용여부(N)'으로 변경
                oRowData.StoreStatus = 'N';
        
                // smanageData 모델 업데이트
                this._getODataUpdate(oSmanageModel, "/Smanage(guid'" + oRowData.Uuid + "')", oRowData)
                    .then(function () {
                        // 성공 시 데이터 모델 다시 설정
                        this._getODataRead(oSmanageModel, "/Smanage")
                            .then(function (aGetData) {
                                var storecodes = aGetData.filter(function (codedata) {
                                    return codedata.StoreStatus === 'Y';
                                }).map(function (codedata) {
                                    return {
                                        StoreCode: codedata.StoreCode,
                                        StoreName: codedata.StoreName,
                                        Uuid: codedata.Uuid,
                                        StoreStatus: codedata.StoreStatus
                                    };
                                });
        
                                var oCodeModel = new JSONModel({ storecodes: storecodes });
                                this.setModel(oCodeModel, "codeModel");
                            }.bind(this))
                            .fail(function (error) {
                                MessageBox.error("편의점 데이터를 불러올 수 없습니다.");
                            });
        
                        // 헤드 데이터 삭제 작업 진행
                        var sFilterPath = "/Head";
                        var aFilters = [
                            new Filter("StoreCode", FilterOperator.EQ, oRowData.StoreCode)
                        ];
        
                        oMainModel.read(sFilterPath, {
                            filters: aFilters,
                            success: function (oData) {
                                if (oData.results.length > 0) {
                                    var aHeadDeletePromises = oData.results.map(function (oHead) {
                                        var sUuid = oHead.Uuid;
                                        var sHeadPath = "/Head(guid'" + sUuid + "')";
        
                                        return new Promise(function (resolve, reject) {
                                            // Head 항목 삭제
                                            oMainModel.remove(sHeadPath, {
                                                success: resolve,
                                                error: reject
                                            });
                                        });
                                    });
        
                                    // 모든 Head 삭제 작업 완료 후 성공 메시지 표시 및 데이터 갱신
                                    Promise.all(aHeadDeletePromises).then(function () {
                                        // 데이터 갱신 또는 필요한 작업 수행
                                        this._getData(); // 데이터 갱신 예시, 실제 메소드로 대체 필요
                                        MessageBox.success("폐업 처리 되었습니다.");
                                    }.bind(this)).catch(function () {
                                        MessageBox.error("헤드 삭제 중 오류가 발생했습니다.");
                                    });
                                } else {
                                    MessageBox.error("해당 StoreCode에 대한 데이터를 찾을 수 없습니다.");
                                }
                            }.bind(this),
                            error: function () {
                                MessageBox.error("헤드 데이터를 불러올 수 없습니다.");
                            }
                        });
                    }.bind(this))
                    .fail(function (error) {
                        MessageBox.error("사용여부가 업데이트 되지 않았습니다.");
                    });
            } else {
                MessageBox.error("해당 StoreCode를 찾을 수 없습니다.");
            }
        },                   

        onCreate: function () {
            var getData = this.getModel("codeModel").getData();
            var selectedStoreCode = this.getView().byId("selectcvname").getSelectedKey();
        
            // storecodes 배열에서 StoreCode가 일치하는 데이터를 찾습니다.
            var oRowData = getData.storecodes.find(function (item) {
                return item.StoreCode === selectedStoreCode;
            });
            if (oRowData) {
                // 기존 다이얼로그 객체가 존재하면 닫고 삭제
                if (this.oConfirmDialog) {
                    this.oConfirmDialog.close();
                    this.oConfirmDialog.destroy(); // 다이얼로그 객체 삭제
                    this.oConfirmDialog = null; // 변수 초기화
                }
        
                // 새로운 다이얼로그 객체 생성
                this.oConfirmDialog = new Dialog({
                    type: DialogType.Message,
                    title: "지점 등록",
                    content: new VerticalLayout({
                        width: "100%",
                        content: [
                            new HorizontalLayout({
                                content: [
                                    new Text({  
                                        width: "90px",
                                        text: "편의점코드 : "
                                    }),
                                    new Input({ value: oRowData.StoreCode, editable: false })
                                ]
                            }),
                            new HorizontalLayout({
                                content: [
                                    new Text({ 
                                        width: "90px",
                                        text: "편의점명 : " 
                                    }),
                                    new Input({ value: oRowData.StoreName, editable: false })
                                ]
                            }),
                        ]
                    }),
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "저장",
                        press: function () {
                            console.log("data", oRowData);
                            this.oConfirmDialog.close();
                    
                            // Page로 이동
                            var oRouter = UIComponent.getRouterFor(this.getView());
                            oRouter.navTo("Page", {
                                Uuid: this.Uuid,
                                storeCode: oRowData.StoreCode,
                                storeName: oRowData.StoreName,
                            });
                        }.bind(this)
                    }),                    
                    endButton: new Button({
                        text: "취소",
                        press: function () {
                            this.oConfirmDialog.close();
                        }.bind(this)
                    })
                });
        
                // 다이얼로그 열기
                this.oConfirmDialog.open();
            } else {
                console.error("해당 StoreCode를 찾을 수 없습니다.");
            }
        },        
        
        //상세페이지 이동
        onMove: function (oEvent) {
            var getData = this.getModel("storeModel").getData();
            var index = oEvent.getSource().getParent().getParent().getIndex();
            var oRowData = getData[index];

            this.navTo("Page", { 
                Uuid: oRowData.Uuid,
                storeCode: oRowData.StoreCode,
                storeName: oRowData.StoreName,
            });
        },

        // value help 창이 열릴 때 호출되는 함수
        onValueHelpRequest: function () {
            // value help dialog가 없으면 새로 생성
            if (!this._oValueHelpDialog) {
                // ValueHelpDialog를 생성하고 필요한 속성들을 설정
                this._oValueHelpDialog = new ValueHelpDialog({
                    title: "편의점 조회", // 다이얼로그 제목
                    supportMultiselect: true, // 다중 선택 지원
                    supportRanges: false, // 범위 선택 지원 안함
                    key: "StoreCode", // 키 필드
                    descriptionKey: "StoreName", // 설명 필드
                    
                    // 확인 버튼을 눌렀을 때 호출되는 함수
                    ok: function (oEvent) {
                        var aSelectedItems = oEvent.getParameter("tokens");
                        // 선택된 토큰들을 MultiInput에 설정
                        var oSelectStorecode = this.byId("selectStorecode");
                        oSelectStorecode.setTokens(aSelectedItems);

                        // 다이얼로그 닫기
                        this._oValueHelpDialog.close();
                    }.bind(this),

                    // 취소 버튼을 눌렀을 때 호출되는 함수
                    cancel: function () {
                        var oSelectStorecode = this.byId("selectStorecode");
                        oSelectStorecode.setTokens([]); // 선택한 값을 초기화

                        // 다이얼로그 닫기
                        this._oValueHelpDialog.close();
                    }.bind(this)
                });

                // 다이얼로그의 테이블에 편의점 코드와 편의점명 컬럼 추가
                var oTable = this._oValueHelpDialog.getTable();
                oTable.addColumn(new Column({
                    label: new Label({ text: "편의점 코드" }),
                    template: new Text({ text: "{StoreCode}" })
                }));
                oTable.addColumn(new sap.ui.table.Column({
                    label: new Label({ text: "편의점명" }),
                    template: new Text({ text: "{StoreName}" })
                }));

                // 부서 데이터를 가져오는 함수 호출
                this._getStoreData();
            } else {
                // 이미 다이얼로그가 존재하면 부서 데이터만 다시 가져옴
                this._getStoreData();
            }

            // 다이얼로그 열기
            this._oValueHelpDialog.open();
        },

        // 편의점 데이터를 가져오는 함수
        _getStoreData: function () {
            // store 모델을 가져옴
            var oStoreModel = this.getOwnerComponent().getModel("smanageData");
            // OData read 요청을 통해 편의점 데이터를 가져옴
            oStoreModel.read("/Smanage", {
                success: function (oData) {
                    // 데이터를 성공적으로 가져온 경우
                    var aStoreData = oData.results.filter(function (storeData) {
                        return storeData.StoreStatus === 'Y';
                    });
                    var oTable = this._oValueHelpDialog.getTable();
                    // 가져온 데이터를 JSON 모델로 설정
                    oTable.setModel(new JSONModel(aStoreData));
                    // 테이블에 데이터 바인딩
                    oTable.bindRows("/");
                    // 다이얼로그 업데이트
                    this._oValueHelpDialog.update();
                }.bind(this),
                error: function () {
                    // 데이터를 가져오는 데 실패한 경우 에러 메시지 표시
                    MessageBox.error("편의점 데이터를 가져오는 데 실패했습니다.");
                }
            });
        },
        // 토큰 삭제 처리 함수
        onDeleteToken: function (oEvent) {
            var oToken = oEvent.getParameter("token");
            var oSelectStorecode = this.byId("selectStorecode");
            var aTokens = oSelectStorecode.getTokens();

            // 삭제된 토큰과 동일한 key를 가진 토큰을 MultiInput에서 제거
            var aNewTokens = aTokens.filter(function (oExistingToken) {
                return oExistingToken.getKey() !== oToken.getKey();
            });

            // 새로운 토큰 배열을 MultiInput에 설정하여 업데이트
            oSelectStorecode.setTokens(aNewTokens);
        },

        // 조회 버튼을 눌렀을 때 호출되는 함수
        onFind: function () {
            debugger;
            var aStoreNames = this.getView().byId("selectStorecode").getTokens().map(function (token) {
                var storeName = token.getText();
                var mainStoreName = storeName.replace(/\s*\(\d+\)$/, ''); 
            
                return mainStoreName.trim(); // Trim any extra spaces
            });

            if (!aStoreNames || aStoreNames.length === 0) {
                MessageBox.error("편의점명을 선택하세요.");
                return;
            }

            var aFilters = [];
            aStoreNames.forEach(function (sStoreName) {
                aFilters.push(new Filter("StoreName", FilterOperator.EQ, sStoreName));
            });

            var oFilter = new Filter({
                filters: aFilters
            });

            var oTable = this.byId("storeTable");
            var oBinding = oTable.getBinding("rows");
            oBinding.filter(oFilter);
        }
    });
});
